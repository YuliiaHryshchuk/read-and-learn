import styles from "./footer.module.scss";

export default function Footer() {
  return (
    <footer className={`${styles.footer} width-100 text-md text-center`}>
      <p>
        Created by{" "}
        <a
          className={styles.link}
          href="https://www.linkedin.com/in/yuliia-hryshchuk-60a841b6/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Yuliia Hryshchuk
        </a>
      </p>
    </footer>
  );
}
