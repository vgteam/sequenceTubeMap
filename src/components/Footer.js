/// Footer.js: main page footer component. Includes project page links and demo link.

import { Container, Row, Col, Navbar, Nav, NavItem } from "reactstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faCode, faDna } from "@fortawesome/free-solid-svg-icons";

import SafeLink from "./SafeLink";

import PACKAGE from "../../package.json";

export const Footer = () => {
  return (
    <Container tag="footer" fluid={true} style={{ marginTop: "1em" }}>
      <Row className="bg-light">
        <Col lg={{ offset: 2, size: 8 }}>
          <Navbar>
            <Nav className="mr-auto">
              <NavItem>
                <SafeLink
                  className="nav-link"
                  target="_blank"
                  href="https://github.com/vgteam/sequenceTubeMap"
                >
                  <FontAwesomeIcon icon={faGithub} /> Github
                </SafeLink>
              </NavItem>
              <NavItem>
                <SafeLink
                  className="nav-link"
                  target="_blank"
                  href="https://genomics.ucsc.edu/"
                >
                  <FontAwesomeIcon icon={faDna} /> UCSC GI
                </SafeLink>
              </NavItem>
            </Nav>
            <Nav>
              <NavItem>
                {PACKAGE.name} v{PACKAGE.version}
              </NavItem>
            </Nav>
            <Nav>
              <NavItem>
                <SafeLink
                  className="nav-link"
                  to="/demo"
                  title="Component Demos"
                  style={{ textDecoration: "none" }}
                >
                  <FontAwesomeIcon icon={faCode} /> Component Demos
                </SafeLink>
              </NavItem>
            </Nav>
          </Navbar>
        </Col>
      </Row>
    </Container>
  );
};

export default Footer;
