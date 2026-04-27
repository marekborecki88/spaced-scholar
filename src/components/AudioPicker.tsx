import { useRef, useState } from "react";
import { Mic, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { audioApi } from "@/api/audioApi";
import { toast } from "sonner";

interface Props {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
}

/**
 * AudioPicker — pick a local audio file (mp3/wav/...), upload it through the
 * mocked audioApi, and return a playable URL via `onChange`.
 */
export function AudioPicker({ value, onChange, label = "audio" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const asset = await audioApi.upload(file);
      onChange(asset.url);
      toast.success("Audio attached");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-neon-magenta/80">{label}</span>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Mic className="h-3.5 w-3.5 mr-1" />}
            {value ? "Replace" : "Upload"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(undefined)}
              aria-label="Remove audio"
            >
              <Trash2 className="h-3.5 w-3.5 text-neon-red" />
            </Button>
          )}
        </div>
      </div>
      {value && (
        <audio
          src={value}
          controls
          className="w-full h-9"
          preload="metadata"
        />
      )}
    </div>
  );
}
