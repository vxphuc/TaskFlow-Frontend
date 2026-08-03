import { Button, Empty, Progress, Skeleton, Tooltip } from 'antd'
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheckCircle,
  FiCircle,
  FiGitBranch,
  FiList,
} from 'react-icons/fi'
import {
  formatDateTime,
  getPriorityLabel,
  getStatusLabel,
} from '../../utils/task'
import styles from './TaskProgressTree.module.css'

const MAX_VISIBLE_CHECKLIST_ITEMS = 5

function ProgressNode({ node, isRoot, onOpenTask }) {
  const visibleItems = node.checklist.slice(0, MAX_VISIBLE_CHECKLIST_ITEMS)
  const hiddenItems = node.checklist.length - visibleItems.length

  return (
    <article className={`${styles.node} ${isRoot ? styles.rootNode : ''}`}>
      <span
        className={`${styles.marker} ${styles[node.status.toLowerCase()]}`}
        aria-hidden="true"
      />
      <div className={styles.nodeContent}>
        <div className={styles.nodeHead}>
          <div>
            <span className={styles.nodeType}>
              {isRoot ? 'TASK CHÍNH' : 'SUBTASK'}
            </span>
            <h3>{node.title}</h3>
          </div>
          {!isRoot && (
            <Tooltip title="Mở chi tiết subtask">
              <Button
                type="text"
                icon={<FiArrowRight />}
                onClick={() => onOpenTask(node.id)}
                aria-label={`Mở subtask ${node.title}`}
              />
            </Tooltip>
          )}
        </div>

        <div className={styles.nodeMeta}>
          <span>{node.assigned_to_name || 'Chưa xác định người thực hiện'}</span>
          <span>{getPriorityLabel(node.priority)}</span>
          <span>Hạn {formatDateTime(node.due_date)}</span>
          <strong className={`${styles.status} ${styles[node.status.toLowerCase()]}`}>
            {getStatusLabel(node.status)}
          </strong>
        </div>

        <div className={styles.nodeProgress}>
          <div>
            <span>
              {node.progress.total
                ? `${node.progress.completed}/${node.progress.total} checklist`
                : 'Theo trạng thái công việc'}
            </span>
            <strong>{node.progress.percentage}%</strong>
          </div>
          <Progress
            percent={node.progress.percentage}
            showInfo={false}
            strokeColor={node.status === 'CANCELLED' ? '#9b3434' : '#206a37'}
            trailColor="#e6ece8"
          />
        </div>

        {visibleItems.length > 0 ? (
          <ul className={styles.checklist}>
            {visibleItems.map((item) => (
              <li
                key={item.id}
                className={item.is_completed ? styles.completedItem : ''}
              >
                {item.is_completed ? <FiCheckCircle /> : <FiCircle />}
                <span>{item.content}</span>
              </li>
            ))}
            {hiddenItems > 0 && (
              <li className={styles.moreItems}>
                <FiList />
                <span>Thêm {hiddenItems} hạng mục khác</span>
              </li>
            )}
          </ul>
        ) : (
          <p className={styles.noChecklist}>
            Chưa có checklist, tiến độ đang dựa trên trạng thái công việc.
          </p>
        )}
      </div>
    </article>
  )
}

export default function TaskProgressTree({ data, loading, onOpenTask }) {
  if (loading) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }

  if (!data) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Chưa thể tải cây tiến độ"
      />
    )
  }

  const { summary } = data

  return (
    <div className={styles.panel}>
      <header className={styles.summaryHeader}>
        <div>
          <span className={styles.eyebrow}>TIẾN ĐỘ TOÀN BỘ CÔNG VIỆC</span>
          <h2>Tổng quan Task và các nhánh thực hiện</h2>
          <p>
            {summary.source === 'CHECKLIST'
              ? 'Tỷ lệ được tính từ các checklist đang hoạt động.'
              : 'Chưa có checklist, tỷ lệ tạm tính theo trạng thái hoàn thành.'}
          </p>
        </div>
        <strong className={styles.overallValue}>{summary.percentage}%</strong>
      </header>

      <Progress
        percent={summary.percentage}
        showInfo={false}
        strokeColor="#206a37"
        trailColor="#e3e9e5"
        size={["100%", 12]}
      />

      <div className={styles.metrics}>
        <div>
          <FiList />
          <span>Checklist</span>
          <strong>
            {summary.checklist_completed}/{summary.checklist_total}
          </strong>
        </div>
        <div>
          <FiGitBranch />
          <span>Subtask hoàn thành</span>
          <strong>{summary.subtask_completed}/{summary.subtask_total}</strong>
        </div>
        <div className={summary.overdue_total ? styles.warningMetric : ''}>
          <FiAlertTriangle />
          <span>Đang quá hạn</span>
          <strong>{summary.overdue_total}</strong>
        </div>
      </div>

      <div className={styles.tree}>
        <ProgressNode
          node={data.root}
          isRoot
          onOpenTask={onOpenTask}
        />
        {data.children.length > 0 ? (
          <div className={styles.children}>
            {data.children.map((node) => (
              <ProgressNode
                key={node.id}
                node={node}
                onOpenTask={onOpenTask}
              />
            ))}
          </div>
        ) : (
          <p className={styles.noChildren}>Task chính chưa có subtask.</p>
        )}
      </div>
    </div>
  )
}
