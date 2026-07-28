import { MediaPlate } from "@/components/ui/MediaPlate";
import { exerciseGifUrl } from "@/lib/exercises";

export function ExerciseGif({
  name,
  gifPath,
  priority,
}: {
  name: string;
  gifPath: string;
  priority?: boolean;
}) {
  return (
    <MediaPlate src={exerciseGifUrl(gifPath)} alt={`${name} demo`} priority={priority} size="hero" />
  );
}
