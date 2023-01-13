/// Footer.js: main page footer component. Includes project page links and demo link.

import { Container, Row, Col, Navbar, Nav, NavItem, NavLink } from "reactstrap"
import { Link } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faGithub } from "@fortawesome/free-brands-svg-icons"
import { faCode, faDna } from "@fortawesome/free-solid-svg-icons"

import PACKAGE from "../../package.json"


export default function Footer() {
  return (
    <Container tag="footer" fluid={true} style={{marginTop: "1em"}}>
      <Row className="bg-light">
        <Col sm={{offset: 2, size: 8}}>
          <Navbar>
            <Nav className="mr-auto">
              <NavItem>
                <NavLink target="_blank" href="https://github.com/vgteam/sequenceTubeMap"><FontAwesomeIcon icon={faGithub} size="md" /> Github</NavLink>
              </NavItem>
              <NavItem>
                <NavLink target="_blank" href="https://genomics.ucsc.edu/"><FontAwesomeIcon icon={faDna} size="md" /> UCSC GI</NavLink>
              </NavItem>
            </Nav>
            <Nav>
              <NavItem>
                {PACKAGE.name} v{PACKAGE.version}
              </NavItem>
            </Nav>
            <Nav>
              <NavItem>
                <Link to="/demo" title="Component Demos" style={{textDecoration: "none"}}><NavLink><FontAwesomeIcon icon={faCode} size="md" /> Component Demos</NavLink></Link>
              </NavItem>
            </Nav>
          </Navbar>
        </Col>
      </Row>
    </Container>
  )
}
