/** Vídeo de un ejercicio: YouTube (sin cookies), Google Drive o enlace externo. */
export function videoEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return null;
}

export function VideoEmbed({ url, title }: { url: string | null | undefined; title: string }) {
  const embed = videoEmbedUrl(url);
  if (!url) return null;
  if (!embed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline">
        Ver vídeo
      </a>
    );
  }
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        src={embed}
        title={`Vídeo: ${title}`}
        className="size-full"
        loading="lazy"
        allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
