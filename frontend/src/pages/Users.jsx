import React from 'react';
import { Separator } from '../components/ui/separator';
import UsersTab from '../components/settings/UsersTab';

const Users = () => {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
                <p className="text-sm text-muted-foreground">Manage user accounts, roles, and invitations.</p>
            </div>
            <Separator />
            <UsersTab />
        </div>
    );
};

export default Users;
