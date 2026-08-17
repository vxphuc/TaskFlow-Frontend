import { Button, Empty, Progress, Skeleton, Tooltip } from 'antd'
import {
  FiArrowRight,
  FiCheckCircle,
  FiCircle,
  FiGitBranch,
  FiUser,
} from 'react-icons/fi'
import { getStatusLabel } from '../../utils/task'
import styles from './SubtaskChecklistOverview.module.css'

export default function SubtaskChecklistOverview({ data, loading, onOpenTask }) {
  if (loading) {
    return (
      <section className={styles.section}>
        <Skeleton active paragraph={{ rows: 5 }} />
      </section>
    )
  }

  const subtasks = (data?.children || []).filter(
    (subtask) => subtask.status !== 'CANCELLED',
  )
  const checklistTotal = subtasks.reduce(
    (total, subtask) => total + subtask.progress.total,
    0,
  )
  const checklistCompleted = subtasks.reduce(
    (total, subtask) => total + subtask.progress.completed,
    0,
  )
  const percentage = checklistTotal
    ? Math.round((checklistCompleted / checklistTotal) * 100)
    : 0

  return (
    <section className={styles.section}>
      <header className={styles.heading}>
        <div>
          <span><FiGitBranch /> CHECKLIST CÔNG VIỆC CON</span>
          <strong>Tiến độ checklist của các Subtask</strong>
          <small>
            {checklistTotal
              ? `${checklistCompleted} trên ${checklistTotal} hạng mục đã hoàn thành`
              : 'Các Subtask hiện chưa có hạng mục checklist'}
          </small>
        </div>
        <strong className={styles.percentage}>{percentage}%</strong>
      </header>

      {checklistTotal > 0 && (
        <Progress
          percent={percentage}
          showInfo={false}
          strokeColor="#206a37"
          railColor="#e6ece8"
        />
      )}

      {subtasks.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Task chính chưa có Subtask đang hoạt động"
        />
      ) : (
        <div className={styles.list}>
          {subtasks.map((subtask) => (
            <article className={styles.card} key={subtask.id}>
              <header className={styles.cardHeader}>
                <div>
                  <strong>{subtask.title}</strong>
                  <span><FiUser /> {subtask.assigned_to_name || 'Chưa xác định người thực hiện'}</span>
                </div>
                <div className={styles.cardActions}>
                  <span className={`${styles.status} ${styles[subtask.status.toLowerCase()]}`}>
                    {getStatusLabel(subtask.status)}
                  </span>
                  <Tooltip title="Mở chi tiết Subtask">
                    <Button
                      type="text"
                      icon={<FiArrowRight />}
                      onClick={() => onOpenTask(subtask.id)}
                      aria-label={`Mở checklist Subtask ${subtask.title}`}
                    />
                  </Tooltip>
                </div>
              </header>

              <div className={styles.cardProgress}>
                <span>
                  {subtask.progress.completed}/{subtask.progress.total} hạng mục
                </span>
                <strong>{subtask.progress.percentage}%</strong>
              </div>
              <Progress
                percent={subtask.progress.percentage}
                showInfo={false}
                strokeColor="#206a37"
                railColor="#e6ece8"
                size="small"
              />

              {subtask.checklist.length ? (
                <ul className={styles.items}>
                  {subtask.checklist.map((item) => (
                    <li
                      key={item.id}
                      className={item.is_completed ? styles.completed : ''}
                    >
                      {item.is_completed ? <FiCheckCircle /> : <FiCircle />}
                      <span>{item.content}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyChecklist}>
                  Subtask này chưa có checklist.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
