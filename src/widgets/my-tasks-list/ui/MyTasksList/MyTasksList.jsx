import { MyServiceCard } from "../../../../entities/my-service/ui/MyServiceCard/MyServiceCard.jsx";
import { isMyServiceStatus } from "../../../../entities/my-service/model/resolveMyServicePresentation.js";
import styles from "./MyTasksList.module.css";

export function MyTasksList({ bookedTasks, demoRecords }) {
  const records = [
    ...bookedTasks.map((booking) => ({ ...booking, status: "booked" })),
    ...demoRecords,
  ].filter((booking) => isMyServiceStatus(booking.status));

  return (
    <section className={styles.list} data-widget="my-tasks-list">
      {records.map((booking) => <MyServiceCard booking={booking} key={booking.id} />)}
    </section>
  );
}
