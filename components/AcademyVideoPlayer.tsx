import styles from "./AcademyVideoPlayer.module.css";

type AcademyVideoPlayerProps = {
  src: string;
  title: string;
};

// Reuse the Academy course briefing frame for public introduction videos.
export default function AcademyVideoPlayer({ src, title }: AcademyVideoPlayerProps) {
  return (
    <div className={styles.player}>
      <div className={styles.heading}>
        <span className={styles.badge}>VIDEO INTRODUCTION</span>
        <span className={styles.title}>{title}</span>
      </div>
      <div className={styles.frame}>
        <video
          src={src}
          aria-label={title + " introduction video"}
          controls
          playsInline
          preload="metadata"
          className={styles.video}
        />
      </div>
      <a className={styles.fallback} href={src} target="_blank" rel="noopener noreferrer">
        Open video in a new tab ↗
      </a>
    </div>
  );
}
