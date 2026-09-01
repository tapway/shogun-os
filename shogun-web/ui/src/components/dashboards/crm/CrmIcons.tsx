import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeftRight,
  Award,
  Banknote,
  BarChart3,
  Bell,
  BookUser,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  CalendarRange,
  Camera,
  Check,
  CheckCircle,
  CheckCircle2,
  Circle,
  CircleDot,
  CircleHelp,
  Clipboard,
  ClipboardList,
  Clock,
  Coins,
  Compass,
  Contact,
  DollarSign,
  Download,
  Drum,
  FileText,
  Flame,
  Gift,
  Handshake,
  Inbox,
  Landmark,
  LayoutDashboard,
  Mailbox,
  Map,
  MapPin,
  Medal,
  MessageSquare,
  Package,
  Phone,
  PieChart,
  Plus,
  Receipt,
  Repeat,
  Rocket,
  Satellite,
  Search,
  Shield,
  Snowflake,
  SquareCheckBig,
  Star,
  Store,
  Target,
  Ticket,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Trophy,
  User,
  UserCog,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

/**
 * Type-safe union of all CRM dashboard icon names.
 */
export type CrmIconName =
  | 'Activity'
  | 'AlertTriangle'
  | 'ArrowDownCircle'
  | 'ArrowLeftRight'
  | 'Award'
  | 'Banknote'
  | 'BarChart3'
  | 'Bell'
  | 'BookUser'
  | 'Bot'
  | 'Brain'
  | 'Briefcase'
  | 'Building2'
  | 'Calendar'
  | 'CalendarDays'
  | 'CalendarRange'
  | 'Camera'
  | 'Check'
  | 'CheckCircle'
  | 'CheckCircle2'
  | 'Circle'
  | 'CircleDot'
  | 'CircleHelp'
  | 'Clipboard'
  | 'ClipboardList'
  | 'Clock'
  | 'Coins'
  | 'Compass'
  | 'Contact'
  | 'DollarSign'
  | 'Download'
  | 'Drum'
  | 'FileText'
  | 'Flame'
  | 'Gift'
  | 'Handshake'
  | 'Inbox'
  | 'Landmark'
  | 'LayoutDashboard'
  | 'Mailbox'
  | 'Map'
  | 'MapPin'
  | 'Medal'
  | 'MessageSquare'
  | 'Package'
  | 'Phone'
  | 'PieChart'
  | 'Plus'
  | 'Receipt'
  | 'Repeat'
  | 'Rocket'
  | 'Satellite'
  | 'Search'
  | 'Shield'
  | 'Snowflake'
  | 'SquareCheckBig'
  | 'Star'
  | 'Store'
  | 'Target'
  | 'Ticket'
  | 'TrendingDown'
  | 'TrendingUp'
  | 'TriangleAlert'
  | 'Trophy'
  | 'User'
  | 'UserCog'
  | 'Users'
  | 'Wrench'
  | 'X'
  | 'Zap';

type IconComponent = React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>;

/**
 * Direct icon name → Lucide component mapping.
 */
export const ICON_MAP: Record<CrmIconName, IconComponent> = {
  Activity,
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeftRight,
  Award,
  Banknote,
  BarChart3,
  Bell,
  BookUser,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Calendar,
  CalendarDays,
  CalendarRange,
  Camera,
  Check,
  CheckCircle,
  CheckCircle2,
  Circle,
  CircleDot,
  CircleHelp,
  Clipboard,
  ClipboardList,
  Clock,
  Coins,
  Compass,
  Contact,
  DollarSign,
  Download,
  Drum,
  FileText,
  Flame,
  Gift,
  Handshake,
  Inbox,
  Landmark,
  LayoutDashboard,
  Mailbox,
  Map,
  MapPin,
  Medal,
  MessageSquare,
  Package,
  Phone,
  PieChart,
  Plus,
  Receipt,
  Repeat,
  Rocket,
  Satellite,
  Search,
  Shield,
  Snowflake,
  SquareCheckBig,
  Star,
  Store,
  Target,
  Ticket,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Trophy,
  User,
  UserCog,
  Users,
  Wrench,
  X,
  Zap,
};

/**
 * Emoji → icon name mapping for legacy emoji-to-icon migration.
 */
export const EMOJI_TO_ICON: Record<string, CrmIconName> = {
  '📊': 'BarChart3',
  '📇': 'Contact',
  '💼': 'Briefcase',
  '🎯': 'Target',
  '🛡️': 'Shield',
  '📥': 'Download',
  '📈': 'TrendingUp',
  '📮': 'Mailbox',
  '💰': 'DollarSign',
  '🏢': 'Building2',
  '🤝': 'Handshake',
  '📸': 'Camera',
  '🤖': 'Bot',
  '📞': 'Phone',
  '➕': 'Plus',
  '⇄': 'ArrowLeftRight',
  '🔍': 'Search',
  '📦': 'Package',
  '🏪': 'Store',
  '📷': 'Camera',
  '🛠️': 'Wrench',
  '📍': 'MapPin',
  '📅': 'Calendar',
  '📋': 'ClipboardList',
  '✅': 'CheckCircle2',
  '📄': 'FileText',
  '⚡': 'Zap',
  '🔔': 'Bell',
  '👥': 'Users',
  '🏆': 'Trophy',
  '📉': 'TrendingDown',
  '🧠': 'Brain',
  '💵': 'Banknote',
  '🚀': 'Rocket',
  '🔥': 'Flame',
  '❄': 'Snowflake',
  '🟢': 'Circle',
  '🔵': 'Circle',
  '🟡': 'Circle',
  '🔴': 'Circle',
  '🏅': 'Medal',
  '🥁': 'Drum',
  '🧾': 'Receipt',
  '🗓': 'CalendarDays',
  '🔁': 'Repeat',
  '📆': 'CalendarRange',
  '🕘': 'Clock',
  '🎖️': 'Award',
  '🎁': 'Gift',
  '🧭': 'Compass',
  '🏛️': 'Landmark',
  '🛰': 'Satellite',
  '✦': 'Star',
  '🎫': 'Ticket',
  '💬': 'MessageSquare',
  '🧑‍💼': 'UserCog',
  '✓': 'Check',
  '✕': 'X',
  '🔻': 'TriangleAlert',
};

export interface CrmIconProps {
  /** Icon name (CrmIconName) or emoji string for auto-resolution */
  name: CrmIconName | string;
  /** Icon size in pixels (default: 16) */
  size?: number;
  /** Additional CSS class names */
  className?: string;
  /** Icon color (any valid CSS color) */
  color?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Unified CRM icon component.
 * Resolves by icon name or emoji fallback. Uses React.createElement
 * to avoid JSX pragma dependency issues.
 */
export function CrmIcon({ name, size = 16, className, color, style }: CrmIconProps): React.ReactElement {
  let resolved: CrmIconName | undefined;
  if (name in ICON_MAP) {
    resolved = name as CrmIconName;
  } else if (name in EMOJI_TO_ICON) {
    resolved = EMOJI_TO_ICON[name];
  }

  const Icon = resolved ? ICON_MAP[resolved] : Circle;

  return React.createElement(Icon, { size, className, color, style });
}

/** Colored status dot — replacement for emoji circles 🟢🔵🟡🔴 */
export function StatusDot({ color }: { color: 'green' | 'blue' | 'yellow' | 'red' }) {
  const colors: Record<string, string> = {
    green: '#34c77b',
    blue: '#007aff',
    yellow: '#ffb340',
    red: '#ff453a',
  };
  return React.createElement('span', {
    style: {
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: colors[color],
      marginRight: 6,
      verticalAlign: 'middle',
    },
  });
}

export default CrmIcon;
