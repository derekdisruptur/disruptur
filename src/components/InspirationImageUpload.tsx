import { useState, useRef } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface InspirationImageUploadProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  disabled?: boolean;
}

export function InspirationImageUpload({ imageUrl, onImageChange, disabled }: InspirationImageUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "INVALID FILE", description: "please upload an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "FILE TOO LARGE", description: "max 5MB allowed.", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("inspiration-images")
      .upload(path, file);

    if (error) {
      console.error("Upload error:", error);
      toast({ title: "UPLOAD FAILED", description: "could not upload image.", variant: "destructive" });
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("inspiration-images")
      .getPublicUrl(path);

    onImageChange(urlData.publicUrl);
    setIsUploading(false);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = () => {
    onImageChange(null);
  };

  return (
    <div className="space-y-3">
      <label className="font-mono text-xs uppercase text-muted-foreground">
        INSPIRATION IMAGE
      </label>

      {imageUrl ? (
        <div className="relative border-2 border-foreground">
          <img
            src={imageUrl}
            alt="Story inspiration"
            className="w-full max-h-64 object-cover"
          />
          {!disabled && (
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 w-8 h-8 bg-background border-2 border-foreground flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className={cn(
            "w-full border-2 border-dashed border-muted-foreground/50 p-8 flex flex-col items-center gap-3 hover:border-foreground transition-colors",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground uppercase">UPLOADING...</span>
            </>
          ) : (
            <>
              <ImagePlus className="w-8 h-8 text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground uppercase">
                ADD A PHOTO THAT INSPIRED THIS STORY
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/60">
                a song cover, a movie poster, a person, a place...
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
