import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Shell mínimo: toda a experiência de notificações vive na `NotificationsCentralPage`.
 */
const NotificationsLayout: React.FC = () => (
  <div className="page notif-hub-root" id="notifications-hub">
    <Outlet />
  </div>
);

export default NotificationsLayout;
