import { useState, useRef } from "react";
import { format } from "date-fns";
import { MessageSquare, Send, Trash2, Edit2, Check, X, Calendar, DollarSign, Users, Gauge, Paperclip, Upload, File, Download } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from "@/hooks/use-comments";
import { useAttachments, useCreateAttachment, useDeleteAttachment } from "@/hooks/use-attachments";
import { useAuth } from "@/contexts/AuthContext";
import { crmService } from "@/services/crm";
import { ProjectRecord, CommentRecord } from "@/types/crm";
import { toast } from "@/components/ui/sonner";

interface ProjectDetailModalProps {
  project: ProjectRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProjectDetailModal({ project, open, onOpenChange }: ProjectDetailModalProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: commentsData, isLoading: commentsLoading } = useComments(undefined, project?.id);
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

  const { data: attachmentsData, isLoading: attachmentsLoading } = useAttachments(undefined, project?.id);
  const createAttachmentMutation = useCreateAttachment();
  const deleteAttachmentMutation = useDeleteAttachment();

  const comments = commentsData?.data || [];

  const handleCreateComment = async () => {
    if (!newComment.trim() || !project) return;

    try {
      await createCommentMutation.mutateAsync({
        content: newComment.trim(),
        projectId: project.id,
      });
      setNewComment("");
      toast.success("Comment added");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  const handleUpdateComment = async (id: number) => {
    if (!editContent.trim()) return;

    try {
      await updateCommentMutation.mutateAsync({
        id,
        content: editContent.trim(),
      });
      setEditingComment(null);
      setEditContent("");
      toast.success("Comment updated");
    } catch (error) {
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (id: number) => {
    try {
      await deleteCommentMutation.mutateAsync(id);
      toast.success("Comment deleted");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const startEditing = (comment: CommentRecord) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditContent("");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !project) return;

    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
    const ALLOWED_TYPES = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 15MB");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("File type not allowed. Please upload PDF, DOC, DOCX, TXT, or image files.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    try {
      const uploadData = await crmService.uploadDocument(file);

      await createAttachmentMutation.mutateAsync({
        filename: uploadData.filename,
        originalName: uploadData.originalName,
        url: uploadData.url,
        size: uploadData.size,
        mimetype: uploadData.mimetype,
        projectId: project.id,
      });

      toast.success("File attached successfully");
    } catch (error) {
      toast.error("Failed to attach file");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteAttachment = async (id: number, filename: string) => {
    try {
      await deleteAttachmentMutation.mutateAsync(id);
      toast.success("Attachment deleted");
    } catch (error) {
      toast.error("Failed to delete attachment");
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">{project.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground capitalize">{project.status}</span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{project.stage} Stage</span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Project Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Progress</span>
              </div>
              <div className="space-y-2">
                <Progress value={project.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{project.progress}% complete</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Budget</span>
              </div>
              <p className="text-sm text-foreground">{project.budget}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Due Date</span>
              </div>
              <p className="text-sm text-foreground">
                {project.dueDate === "" ? "No due date" : format(new Date(project.dueDate), "MMM d, yyyy")}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Team</span>
              </div>
              <p className="text-sm text-foreground">
                {project.team.length === 0 ? "No team assigned" : project.team.join(", ")}
              </p>
            </div>
          </div>

          {project.description && (
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground">
                Comments ({comments.length})
              </h3>
            </div>

            {/* Add Comment */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleCreateComment();
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Press Ctrl+Enter to submit
                </p>
                <Button
                  size="sm"
                  onClick={handleCreateComment}
                  disabled={!newComment.trim() || createCommentMutation.isPending}
                  className="gap-2"
                >
                  <Send className="h-3 w-3" />
                  Comment
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {commentsLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No comments yet</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src="" alt={comment.author.name} />
                      <AvatarFallback className="text-xs">
                        {comment.author.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          {comment.author.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>

                      {editingComment === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[60px] resize-none text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateComment(comment.id)}
                              disabled={updateCommentMutation.isPending}
                              className="h-7 gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              className="h-7 gap-1"
                            >
                              <X className="h-3 w-3" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {comment.content}
                          </p>

                          {comment.authorId === user?.id && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditing(comment)}
                                className="h-6 px-2 text-xs gap-1"
                              >
                                <Edit2 className="h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteComment(comment.id)}
                                disabled={deleteCommentMutation.isPending}
                                className="h-6 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-foreground">
                Attachments ({attachmentsData?.data.length || 0})
              </h3>
            </div>

            {/* Upload Button */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="*/*"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={createAttachmentMutation.isPending}
                className="gap-2"
              >
                <Upload className="h-3 w-3" />
                Attach File
              </Button>
            </div>

            {/* Attachments List */}
            <div className="space-y-2">
              {attachmentsLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading attachments...</div>
              ) : attachmentsData?.data.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No attachments yet</div>
              ) : (
                attachmentsData?.data.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/20">
                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {attachment.originalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(attachment.size / 1024).toFixed(1)} KB • {format(new Date(attachment.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(attachment.url, "_blank")}
                        className="h-7 px-2 gap-1"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      {attachment.authorId === user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAttachment(attachment.id, attachment.filename)}
                          disabled={deleteAttachmentMutation.isPending}
                          className="h-7 px-2 gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
