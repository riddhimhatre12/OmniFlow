export type Route = '/' | '/login' | '/dashboard' | '/profile';

export interface NavItem {
  id: string;
  label: string;
  iconName: string;
  badge?: string;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}
