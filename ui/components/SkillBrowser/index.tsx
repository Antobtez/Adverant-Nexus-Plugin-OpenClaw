'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search,
  Zap,
  Star,
  Clock,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: Array<{ name: string; type: string; required: boolean }>;
  isFavorite?: boolean;
  lastUsed?: string;
}

const CATEGORIES = [
  'All',
  'File Operations',
  'Web Scraping',
  'Data Processing',
  'Communication',
  'Automation',
  'Utilities',
  'AI/ML',
  'Database',
];

export function SkillBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillParameters, setSkillParameters] = useState<Record<string, any>>({});
  const [executionResult, setExecutionResult] = useState<{
    success: boolean;
    result?: any;
    error?: string;
  } | null>(null);
  const { wsClient } = useWebSocket();

  // Fetch skills list
  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills', 'list'],
    queryFn: () => apiClient.skills.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load favorites from localStorage
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const stored = localStorage.getItem('openclaw_favorite_skills');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Filter skills
  const filteredSkills = useMemo(() => {
    return skills
      .filter((skill) => {
        const matchesSearch =
          skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          skill.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === 'All' || skill.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .map((skill) => ({
        ...skill,
        isFavorite: favorites.has(skill.id),
      }))
      .sort((a, b) => {
        // Sort: favorites first, then alphabetically
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [skills, searchQuery, selectedCategory, favorites]);

  // Execute skill mutation
  const executeSkillMutation = useMutation({
    mutationFn: ({ skillId, parameters }: { skillId: string; parameters: Record<string, any> }) =>
      apiClient.skills.execute(skillId, parameters),
    onSuccess: (data) => {
      setExecutionResult(data);
    },
    onError: (error: any) => {
      setExecutionResult({
        success: false,
        error: error.message || 'Failed to execute skill',
      });
    },
  });

  // Toggle favorite
  const toggleFavorite = (skillId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(skillId)) {
      newFavorites.delete(skillId);
    } else {
      newFavorites.add(skillId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('openclaw_favorite_skills', JSON.stringify([...newFavorites]));
  };

  // Open skill details dialog
  const openSkillDetails = async (skill: Skill) => {
    setSelectedSkill(skill);
    setSkillParameters({});
    setExecutionResult(null);

    // Fetch detailed info
    try {
      const details = await apiClient.skills.getDetails(skill.id);
      setSelectedSkill(details);
    } catch (error) {
      console.error('Failed to fetch skill details:', error);
    }
  };

  // Execute skill
  const handleExecuteSkill = () => {
    if (!selectedSkill) return;

    executeSkillMutation.mutate({
      skillId: selectedSkill.id,
      parameters: skillParameters,
    });
  };

  if (isLoading) {
    return (
      <Card className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading skills...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header with Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skills..."
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="secondary" className="px-3 py-2">
                {filteredSkills.length} skills
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => (
            <Card
              key={skill.id}
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => openSkillDetails(skill)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{skill.name}</CardTitle>
                    <Badge variant="outline" className="mt-2">
                      {skill.category}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(skill.id);
                    }}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        skill.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''
                      }`}
                    />
                  </Button>
                </div>
                <CardDescription className="line-clamp-2">{skill.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {skill.parameters.length} params
                  </span>
                  {skill.lastUsed && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Used recently
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSkills.length === 0 && (
          <Card className="flex h-64 items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">No skills found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Skill Detail Dialog */}
      <Dialog open={!!selectedSkill} onOpenChange={() => setSelectedSkill(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedSkill?.name}
              <Badge variant="outline">{selectedSkill?.category}</Badge>
            </DialogTitle>
            <DialogDescription>{selectedSkill?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Parameters */}
            {selectedSkill?.parameters && selectedSkill.parameters.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium">Parameters</h4>
                <div className="space-y-3">
                  {selectedSkill.parameters.map((param) => (
                    <div key={param.name}>
                      <label className="mb-1 flex items-center gap-2 text-sm">
                        {param.name}
                        {param.required && <Badge variant="destructive">Required</Badge>}
                      </label>
                      <Input
                        type={param.type === 'number' ? 'number' : 'text'}
                        placeholder={`Enter ${param.name} (${param.type})`}
                        value={skillParameters[param.name] || ''}
                        onChange={(e) =>
                          setSkillParameters({
                            ...skillParameters,
                            [param.name]: e.target.value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Result */}
            {executionResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {executionResult.success ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        Execution Successful
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        Execution Failed
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-60 overflow-auto rounded bg-muted p-3 text-xs">
                    {JSON.stringify(
                      executionResult.success ? executionResult.result : executionResult.error,
                      null,
                      2
                    )}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSkill(null)}>
              Close
            </Button>
            <Button
              onClick={handleExecuteSkill}
              disabled={executeSkillMutation.isPending}
            >
              {executeSkillMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Skill
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
