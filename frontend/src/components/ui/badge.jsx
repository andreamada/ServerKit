import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-primary text-primary-foreground',
                secondary:
                    'border-transparent bg-secondary text-secondary-foreground',
                destructive:
                    'border-transparent bg-destructive text-destructive-foreground',
                outline:
                    'text-foreground',
                success:
                    'border-transparent bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
                warning:
                    'border-transparent bg-amber-500/15 text-amber-500 border-amber-500/20',
                danger:
                    'border-transparent bg-red-500/15 text-red-500 border-red-500/20',
                info:
                    'border-transparent bg-blue-500/15 text-blue-500 border-blue-500/20',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => (
    <span
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
    />
));
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
