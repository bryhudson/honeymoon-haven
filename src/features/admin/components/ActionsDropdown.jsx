import React from 'react';
import { Edit, Ban, DollarSign, Bell } from 'lucide-react';
import { MenuDropdown } from '../../../components/ui/MenuDropdown';

export function ActionsDropdown({
    onEdit,
    onCancel,
    isCancelled,
    onToggleStatus,
    isFinalized,
    onTogglePaid,
    isPaid,
    onEditPayment,
    onSendReminder,
    onRemindToBook
}) {
    const items = [
        {
            label: "Edit Details",
            icon: Edit,
            onClick: onEdit,
            hidden: !onEdit
        },
        {
            label: "Cancel Booking",
            icon: Ban,
            onClick: onCancel,
            hidden: isCancelled || !onCancel,
            divider: true,
            className: "text-orange-600 hover:bg-orange-50 hover:text-orange-700"
        },
        {
            label: "Edit Fee Details",
            icon: Edit,
            onClick: onEditPayment,
            hidden: !isPaid || isCancelled || !onEditPayment,
            divider: true,
            className: "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        },
        {
            label: isPaid ? "Clear Fee Record" : "Mark Fee Received",
            icon: DollarSign,
            onClick: onTogglePaid,
            hidden: isCancelled || !onTogglePaid,
            divider: true,
            className: isPaid
                ? 'text-red-700 hover:bg-red-50 hover:text-red-800'
                : 'text-green-700 hover:bg-green-50 hover:text-green-800'
        },
        {
            label: "Send Maintenance Fee Reminder",
            icon: Bell,
            onClick: onSendReminder,
            hidden: isCancelled || isPaid || !onSendReminder,
            divider: true,
            className: "text-blue-600 hover:bg-blue-50 hover:text-blue-700"
        },
        {
            label: "Remind to Book",
            icon: Bell,
            onClick: onRemindToBook,
            hidden: !onRemindToBook,
            divider: true,
            className: "text-purple-600 hover:bg-purple-50 hover:text-purple-700"
        }
    ];

    return <MenuDropdown items={items} width={220} />;
}
