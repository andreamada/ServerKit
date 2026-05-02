import ActivityTab from '../components/settings/ActivityTab';

const Activity = () => {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Activity Dashboard</h1>
                <p className="text-sm text-muted-foreground">Monitor team activity, audit actions, and system events</p>
            </div>
            <ActivityTab />
        </div>
    );
};

export default Activity;
