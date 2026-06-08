import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Shell mínimo: toda a experiência de notificações vive na `NotificationsCentralPage`.
 */
const NotificationsLayout: React.FC = () => (
  <div className="page w-full max-w-full min-w-0" id="notifications-hub">
    <Outlet />
  </div>
);

export default NotificationsLayout;
