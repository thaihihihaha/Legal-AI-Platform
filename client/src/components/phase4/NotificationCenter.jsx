/**
 * PHASE 4.6: Notification Center Component
 * In-app notifications, reminders, and notification preferences
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export const NotificationCenter = ({ userId, token }) => {
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notifications'); // notifications, reminders, settings
  const [unreadCount, setUnreadCount] = useState(0);
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    recurring: 'none',
  });
  const [showNewReminder, setShowNewReminder] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchReminders();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`/v1/notifications?user_id=${userId}`, { headers });
      const notifsArray = res.data.data || [];
      setNotifications(notifsArray);
      setUnreadCount(notifsArray.filter((n) => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`/v1/reminders?user_id=${userId}`, { headers });
      setReminders(res.data.data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `/v1/notifications/${notificationId}/read`,
        {},
        { headers }
      );
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleCreateReminder = async () => {
    if (!newReminder.title || !newReminder.dueDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        '/v1/reminders',
        {
          title: newReminder.title,
          description: newReminder.description,
          dueDate: `${newReminder.dueDate}T${newReminder.dueTime || '09:00'}:00`,
          recurring: newReminder.recurring,
          userId,
        },
        { headers }
      );

      setNewReminder({ title: '', description: '', dueDate: '', dueTime: '', recurring: 'none' });
      setShowNewReminder(false);
      fetchReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      alert('Error creating reminder');
    }
  };

  const handleCompleteReminder = async (reminderId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        `/v1/reminders/${reminderId}/complete`,
        {},
        { headers }
      );
      fetchReminders();
    } catch (error) {
      console.error('Error completing reminder:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'review_request':
        return '👁️';
      case 'comment':
        return '💬';
      case 'shared':
        return '👥';
      case 'signed':
        return '✍️';
      case 'reminder':
        return '🔔';
      case 'system':
        return '⚙️';
      default:
        return '📬';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {activeTab === 'reminders' && (
            <button
              onClick={() => setShowNewReminder(!showNewReminder)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              + New Reminder
            </button>
          )}
        </div>
      </div>

      {/* New Reminder Form */}
      {showNewReminder && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Reminder title"
              value={newReminder.title}
              onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={newReminder.description}
              onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="date"
                value={newReminder.dueDate}
                onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="time"
                value={newReminder.dueTime}
                onChange={(e) => setNewReminder({ ...newReminder, dueTime: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newReminder.recurring}
                onChange={(e) => setNewReminder({ ...newReminder, recurring: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateReminder}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Reminder
              </button>
              <button
                onClick={() => setShowNewReminder(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 font-medium border-b-2 relative ${
            activeTab === 'notifications'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Notifications
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'reminders'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Reminders ({reminders.filter((r) => !r.completed).length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === 'settings'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent'
          }`}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border-l-4 cursor-pointer transition ${
                    notif.read
                      ? 'bg-gray-50 border-gray-300'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                  onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                >
                  <div className="text-2xl">{getNotificationIcon(notif.type)}</div>
                  <div className="flex-1">
                    <div className={`font-semibold ${notif.read ? 'text-gray-600' : 'text-gray-900'}`}>
                      {notif.title}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {notif.message}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(notif.created_at).toLocaleString()}
                    </div>
                  </div>
                  {!notif.read && (
                    <span className="w-3 h-3 bg-blue-600 rounded-full mt-1 flex-shrink-0"></span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reminders' && (
          <div className="space-y-3">
            {reminders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No reminders yet. Create one to get started.
              </div>
            ) : (
              <>
                {/* Upcoming Reminders */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Upcoming</h3>
                  <div className="space-y-2">
                    {reminders
                      .filter((r) => !r.completed)
                      .map((reminder) => (
                        <div
                          key={reminder.id}
                          className="flex items-start gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
                        >
                          <div className="text-2xl">⏰</div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{reminder.title}</div>
                            {reminder.description && (
                              <div className="text-sm text-gray-600 mt-1">{reminder.description}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              Due: {new Date(reminder.due_date).toLocaleString()}
                            </div>
                            {reminder.recurring && reminder.recurring !== 'none' && (
                              <div className="text-xs text-yellow-700 mt-1 font-medium">
                                Recurring: {reminder.recurring}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleCompleteReminder(reminder.id)}
                            className="text-green-600 hover:text-green-700 text-sm font-medium whitespace-nowrap"
                          >
                            Mark Done
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Completed Reminders */}
                {reminders.filter((r) => r.completed).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 mt-6">Completed</h3>
                    <div className="space-y-2">
                      {reminders
                        .filter((r) => r.completed)
                        .map((reminder) => (
                          <div
                            key={reminder.id}
                            className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg opacity-75"
                          >
                            <div className="text-2xl">✅</div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 line-through">
                                {reminder.title}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Completed: {new Date(reminder.completed_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Notification Preferences</h3>
              <div className="space-y-3">
                {[
                  { label: 'Review Requests', type: 'review_request' },
                  { label: 'New Comments', type: 'comment' },
                  { label: 'Document Shared', type: 'shared' },
                  { label: 'Document Signed', type: 'signed' },
                  { label: 'Reminder Alerts', type: 'reminder' },
                  { label: 'System Updates', type: 'system' },
                ].map((pref) => (
                  <label key={pref.type} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{pref.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Delivery Methods</h3>
              <div className="space-y-3">
                {[
                  { label: 'In-app Notifications', icon: '📬' },
                  { label: 'Email Notifications', icon: '📧' },
                  { label: 'SMS Alerts', icon: '📱' },
                ].map((method) => (
                  <label key={method.label} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={method.label !== 'SMS Alerts'}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xl mr-2">{method.icon}</span>
                    <span className="text-gray-700">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quiet Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Start Time</label>
                  <input
                    type="time"
                    defaultValue="22:00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">End Time</label>
                  <input
                    type="time"
                    defaultValue="08:00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⏱️ Notifications will not be delivered during these hours
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
