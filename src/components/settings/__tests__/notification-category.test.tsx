import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationCategoryCard } from '../NotificationCategoryCard'
import { NOTIFICATION_METADATA } from '@/lib/notifications/metadata'

it('disables every control while a preference is being saved', async () => {
  const metadata = NOTIFICATION_METADATA.task_assigned, toggle = jest.fn()
  render(<NotificationCategoryCard title="Tarefas" icon="📋" notifications={[metadata]} preferences={{task_assigned:{inApp:true,push:false,email:false}}} saving onToggle={toggle} />)
  for(const control of screen.getAllByRole('switch')) expect(control).toBeDisabled()
  await userEvent.click(screen.getByRole('switch',{name:`${metadata.label} - Email`}))
  expect(toggle).not.toHaveBeenCalled()
})

it('keeps chat email locked while allowing supported channel choices', async () => {
  const metadata = NOTIFICATION_METADATA.message_received, toggle = jest.fn()
  render(<NotificationCategoryCard title="Chat" icon="💬" notifications={[metadata]} preferences={{message_received:{inApp:true,push:false,email:false}}} saving={false} onToggle={toggle} />)
  const email = screen.getByRole('switch',{name:`${metadata.label} - Email`})
  expect(email).toBeDisabled()
  await userEvent.click(email)
  expect(toggle).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('switch',{name:`${metadata.label} - Push`}))
  expect(toggle).toHaveBeenCalledWith('message_received','push',true)
})
