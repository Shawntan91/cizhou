import { useAuth } from '../hooks/useAuth'
import { PageHeader } from '../components/ui/PageHeader'

export function ProfilePage() {
  const { user } = useAuth()

  return (
    <div>
      <PageHeader eyebrow="个人中心" title="账户设置" desc="管理你的账户信息。" />

      <div className="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
        <div className="p-8 flex items-center gap-6 border-b border-ink-50">
          <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center text-2xl font-medium text-ink-700">
            {(user?.username || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-bold text-ink-900">{user?.username}</div>
            <div className="text-sm text-ink-400 mt-1">{user?.email}</div>
          </div>
        </div>

        <div className="divide-y divide-ink-50">
          <SettingRow label="目标" value="考研英语一" />
          <SettingRow label="每日新词上限" value="20 词" />
          <SettingRow label="复习提醒" value="已开启" />
          <SettingRow label="数据同步" value="本地存储" />
          <SettingRow label="版本" value="v0.1.0" />
        </div>

        <div className="p-6 bg-ink-50/50">
          <div className="text-xs text-ink-400 leading-relaxed">
            <div className="font-medium text-ink-600 mb-1">关于词舟</div>
            词舟是一款 AI 驱动的智能背单词工具，融合艾宾浩斯遗忘曲线与 Anki 间隔重复算法。
            上传考研真题 PDF，自动提取核心词汇、熟词僻义与作文高级表达，形成个人专属复习词库。
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-8 py-4">
      <span className="text-sm text-ink-600">{label}</span>
      <span className="text-sm text-ink-300">{value}</span>
    </div>
  )
}
