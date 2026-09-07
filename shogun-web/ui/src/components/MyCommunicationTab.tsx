// Stub for MyCommunicationTab - WIP from sibling agent
interface MyCommunicationTabProps {
  department: string;
  displayName: string;
  commsChannels: any[];
  isAdmin: boolean;
}

export function MyCommunicationTab({ department, displayName, commsChannels, isAdmin }: MyCommunicationTabProps) {
  return (
    <div className="p-4 text-center" style={{ color: 'var(--samurai-muted)' }}>
      <p>MyCommunicationTab — under development for {displayName}</p>
      <p className="text-xs mt-2">Department: {department} | Admin: {isAdmin ? 'Yes' : 'No'} | Channels: {commsChannels.length}</p>
    </div>
  );
}
