import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

function App() {

  const URL = 'http://localhost:5000';

  var [users, setUsers] = useState([]);

  useEffect(() => {
    fetch(URL + "/getUsersInfo", {
      method: "GET",
      headers: {
        Authorization: Cookies.get("jwt_token")
      }
    })
      .then(response => {
        return response.json();
      })
      .then(data => setUsers(data))
      .catch(err => console.log(err))
  }, [])

  function removeUser(chatId) {
    //call the api with chatID to remove user
    fetch(URL + "/deleteUser" + "?chatId=" + chatId, {
      method: "GET",
      headers: {
        Authorization: Cookies.get("jwt_token")
      }
    })
      .then(response => {
        return response.json();
      })
      .then(data => console.log(data))
      .catch(err => console.log(err));
    alert("User Removed");
    window.location.href = "/";
  }
  function blockUser(chatId) {
    //call the api with chatID to block user
    fetch(URL + "/blockUser" + "?chatId=" + chatId, {
      method: "GET",
      headers: {
        Authorization: Cookies.get("jwt_token")
      }
    })
      .then(response => {
        return response.json();
      })
      .then(data => console.log(data))
      .catch(err => console.log(err));
    alert("User Blocked");
    window.location.href = "/";
  }

  function logout(){
    window.location.href = URL + "/revoke" + "?access_token=" + Cookies.get("access_token");
    alert("Logged out");    
  }

  return (
    <div className="App">
      <header className="App-header">
        {!(Cookies.get("jwt_token")) && <>
          <h3>
            Welcome to ADMIN console for Telegram weather bot assessment
          </h3>
          <br />
          <a href={URL + '/auth/google'}><Button variant="primary">Sigin with google</Button></a>
        </>}
        {(Cookies.get("jwt_token")) && <Container>
          <Row>
            <Col>
              <h3>Manage Users:</h3>
              {console.log(users)}
              <br />
              <Table bordered hover>
                <thead>
                  <tr>
                    <th>Chat ID</th>
                    <th>Name</th>
                    <th>Is Blocked?</th>
                    <th>Last Update Sent</th>
                    <th>Location</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(users) && users.map(element => {
                    return <tr key={element.chatId}>
                      <td>{element.chatId}</td>
                      <td>{element.firstName}</td>
                      <td>{JSON.stringify(element.isBlocked)}</td>
                      <td>{element.lastUpdateSent}</td>
                      <td>{element.location}</td>
                      <td><Button onClick={() => blockUser(element.chatId)}>Block</Button></td>
                      <td><Button onClick={() => removeUser(element.chatId)}>Remove</Button></td>
                    </tr>
                  })}
                </tbody>
              </Table>
            </Col>

          </Row>
        </Container>}
        <br></br>
        {(Cookies.get("jwt_token")) && <Button onClick={()=>logout()}>Logout</Button>}
      </header>
    </div>
  );
}

export default App;
