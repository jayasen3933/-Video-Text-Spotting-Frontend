import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you were looking for does not exist."
      action={
        <Link to="/" className="text-sm font-medium text-zinc-900 underline underline-offset-4">
          Go to New analysis
        </Link>
      }
    />
  );
}
