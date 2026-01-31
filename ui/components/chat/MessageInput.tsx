'use client';

/**
 * MessageInput Component - Chat input with attachments and skill suggestions
 */

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Paperclip,
  Send,
  Sparkles,
  X,
  Image as ImageIcon,
  FileText,
  Mic,
  StopCircle,
} from 'lucide-react';

interface AttachmentPreview {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document' | 'audio';
}

interface MessageInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showSkillButton?: boolean;
  onSkillClick?: () => void;
  className?: string;
}

export function MessageInput({
  onSend,
  onTypingStart,
  onTypingStop,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 4000,
  showSkillButton = true,
  onSkillClick,
  className,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, []);

  // Handle message change with typing indicator
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= maxLength) {
        setMessage(value);
        adjustTextareaHeight();

        // Typing indicator logic
        if (!isTyping) {
          setIsTyping(true);
          onTypingStart?.();
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          onTypingStop?.();
        }, 2000);
      }
    },
    [maxLength, isTyping, onTypingStart, onTypingStop, adjustTextareaHeight]
  );

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const newAttachments: AttachmentPreview[] = files.map((file) => {
      const type = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'document';

      const attachment: AttachmentPreview = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        type,
      };

      // Create preview for images
      if (type === 'image') {
        attachment.preview = URL.createObjectURL(file);
      }

      return attachment;
    });

    setAttachments((prev) => [...prev, ...newAttachments]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Send message
  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && attachments.length === 0) return;

    onSend(
      trimmedMessage,
      attachments.length > 0 ? attachments.map((a) => a.file) : undefined
    );

    // Clear state
    setMessage('');
    setAttachments([]);
    setIsTyping(false);
    onTypingStop?.();

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, attachments, onSend, onTypingStop]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className={cn('border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900', className)}>
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            >
              {attachment.type === 'image' && attachment.preview ? (
                <img
                  src={attachment.preview}
                  alt={attachment.file.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : attachment.type === 'image' ? (
                <ImageIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <FileText className="h-5 w-5 text-gray-400" />
              )}
              <div className="max-w-[100px] truncate text-sm text-gray-700 dark:text-gray-300">
                {attachment.file.name}
              </div>
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-10 w-10 flex-shrink-0"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Skill button */}
        {showSkillButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSkillClick}
            disabled={disabled}
            className="h-10 w-10 flex-shrink-0"
          >
            <Sparkles className="h-5 w-5" />
          </Button>
        )}

        {/* Text input */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm',
              'placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
              'dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'max-h-[150px]'
            )}
          />
          {message.length > maxLength * 0.8 && (
            <div className="absolute bottom-1 right-2 text-xs text-gray-400">
              {message.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Voice button (optional) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsRecording(!isRecording)}
          disabled={disabled}
          className="h-10 w-10 flex-shrink-0"
        >
          {isRecording ? (
            <StopCircle className="h-5 w-5 text-red-500" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className="h-10 w-10 flex-shrink-0"
          size="icon"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export default MessageInput;
