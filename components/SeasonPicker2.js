import styles from '../styles/Navbar.module.css';

export default function SeasonPicker2() {
  return <header className={styles.navbar}>
    <div className={styles.navitemwrapper} />
    <div className={styles.navitemwrapper2}><span className={styles.navitemactive}>season 9</span></div>
  </header>;
}
