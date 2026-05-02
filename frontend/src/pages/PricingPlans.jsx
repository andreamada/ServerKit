import React from 'react';
import { Separator } from '../components/ui/separator';
import PricingPlansTab from '../components/settings/PricingPlansTab';

const PricingPlans = () => {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Pricing Plans</h1>
                <p className="text-sm text-muted-foreground">Define and manage subscription tiers for your customers.</p>
            </div>
            <Separator />
            <PricingPlansTab />
        </div>
    );
};

export default PricingPlans;
