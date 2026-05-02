import React from 'react';
import { Package } from 'lucide-react';
import { Separator } from '../components/ui/separator';

const Subscriptions = () => {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscriptions</h1>
                <p className="text-sm text-muted-foreground">View and manage customer subscriptions.</p>
            </div>
            <Separator />
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                    <p className="text-base font-semibold text-foreground">No subscriptions yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Customer subscriptions will appear here once billing is configured.</p>
                </div>
            </div>
        </div>
    );
};

export default Subscriptions;
