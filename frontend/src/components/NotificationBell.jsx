import { Bell, CheckCheck, PackageCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';

const iconMap = {
  new_listing: Bell,
  expiry_warning: Bell,
  category_downgrade: Bell,
  claimed: PackageCheck,
  pickup_confirmed: CheckCheck
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const { notifications } = useSocket() || {};

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        setItems(response.data.data);
      } catch (error) {
        setItems([]);
      }
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    if (notifications?.length) {
      setItems((current) => [...notifications, ...current]);
    }
  }, [notifications]);

  const unreadCount = items.filter((item) => !item.isRead).length;

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setItems((current) => current.map((item) => (item._id === notificationId ? { ...item, isRead: true } : item)));
    } catch (error) {
      return null;
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-full border border-stone-200 bg-white p-3 shadow-sm"
      >
        <Bell className="h-5 w-5 text-slate-700" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-clay px-2 py-0.5 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-20 w-80 rounded-3xl border border-stone-200 bg-white p-4 shadow-panel">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            <span className="text-xs text-slate-600">{unreadCount} unread</span>
          </div>

          <div className="max-h-96 space-y-3 overflow-auto pr-1">
            {items.length ? (
              items.map((item) => {
                const Icon = iconMap[item.type] || Bell;
                return (
                  <button
                    type="button"
                    key={item._id}
                    onClick={() => markAsRead(item._id)}
                    className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left ${item.isRead ? 'bg-stone-50' : 'bg-bridge-50'}`}
                  >
                    <div className="rounded-2xl bg-white p-2 shadow-sm">
                      <Icon className="h-4 w-4 text-bridge-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.message}</p>
                      <p className="mt-1 text-xs text-slate-600">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="rounded-2xl bg-stone-50 p-4 text-sm text-slate-600">No notifications yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
