import Link from "next/link";
import styles from "./Wordmark.module.css";

/** The app name. Three offset dots hint at accounts being sorted into rows. */
export function Wordmark() {
  return (
    <Link href="/" className={styles.wordmark}>
      <span className={styles.mark} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      Followlist Sorter
    </Link>
  );
}
