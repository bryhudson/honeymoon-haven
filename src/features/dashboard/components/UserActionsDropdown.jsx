import React from 'react';
import { Edit, Key, Trash2, Eye, Sparkles } from 'lucide-react';
import { MenuDropdown } from '../../../components/ui/MenuDropdown';

export function UserActionsDropdown({ user, onEdit, onPassword, onDelete, onResetBanner }) {
    const handleViewAs = () => {
        window.location.href = `#/?masquerade=${encodeURIComponent(user.name)}`;
    };

    const items = [
        {
            label: "View as Shareholder",
            icon: Eye,
            onClick: handleViewAs,
            className: "text-slate-700 hover:bg-purple-50 hover:text-purple-600"
        },
        {
            label: "Edit Email",
            icon: Edit,
            onClick: () => onEdit(user),
            divider: true
        },
        {
            label: "Change Password",
            icon: Key,
            onClick: () => onPassword(user),
            className: "text-slate-700 hover:bg-amber-50 hover:text-amber-600"
        },
        {
            label: "Reset Welcome Banner",
            icon: Sparkles,
            onClick: () => onResetBanner(user),
            hidden: !onResetBanner,
            className: "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
        },
        {
            label: "Delete User",
            icon: Trash2,
            onClick: () => onDelete(user),
            divider: true,
            danger: true
        }
    ];

    return <MenuDropdown items={items} width={200} />;
}
