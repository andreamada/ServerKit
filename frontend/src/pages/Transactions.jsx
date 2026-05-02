import React from 'react';
import { DollarSign } from 'lucide-react';
import { Separator } from '../components/ui/separator';

const Transactions = () => {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Transactions</h1>
                <p className="text-sm text-muted-foreground">Review payment history and transaction records.</p>
            </div>
            <Separator />
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                    <p className="text-base font-semibold text-foreground">No transactions yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Payment records will appear here once billing is active.</p>
                </div>
            </div>
        </div>
    );
};

export default Transactions;
