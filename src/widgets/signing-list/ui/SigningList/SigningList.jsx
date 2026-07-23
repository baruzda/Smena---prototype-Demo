import { SigningCard } from "../../../../entities/signing/ui/SigningCard/SigningCard.jsx";
import { resolveSigningPresentation } from "../../../../entities/signing/model/resolveSigningPresentation.js";
import styles from "./SigningList.module.css";

export function SigningList({ records, onPrimaryAction }) {
  const signingRecords = records
    .filter((booking) => booking.status === "signing")
    .sort((left, right) => (
      resolveSigningPresentation(left).order - resolveSigningPresentation(right).order
    ));

  if (signingRecords.length === 0) {
    return <p className={styles.empty}>Заданий на подписание нет</p>;
  }

  return (
    <section className={styles.list} data-widget="signing-list">
      {signingRecords.map((booking) => (
        <SigningCard booking={booking} key={booking.id} onPrimaryAction={onPrimaryAction} />
      ))}
    </section>
  );
}
