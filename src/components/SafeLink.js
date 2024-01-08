/// SafeLink.js: React Router-compatible Link component that doesn't explode if
/// not used inside a React Router.

import { Link, useInRouterContext } from "react-router-dom";

export const SafeLink = ({ children, ...props }) => {
  // Find out if we are in a router
  let insideRouter = useInRouterContext();
  if (insideRouter) {
    // We can use Link
    return <Link {...props}>{children}</Link>;
  } else {
    // We can't use Link
    // Also try to fix to -> href
    let { to, href, ...otherProps } = props;
    let fixedProps = { href: href || to, ...otherProps };
    return <a {...fixedProps}>{children}</a>;
  }
};

export default SafeLink;
