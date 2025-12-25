// Backwards compatibility: Re-export AppLayout as Layout
// This allows existing pages to continue using the old import path
import { AppLayout } from './layout/AppLayout';

const Layout = (props) => {
  return <AppLayout {...props} />;
};

export default Layout;
