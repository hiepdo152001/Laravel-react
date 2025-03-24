import React from "react";
import "../../public/auth/login.css"; 
import videoBg from "../../public/auth/Ipad.mp4";
import { Link } from "react-router-dom"; 


const Login = () => {
  return (
    <div className="video-container">
      <video autoPlay loop muted className="background-video">
        <source src={videoBg} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="content">
        <div className="main-content-agile">
          <div className="sub-main-w3">
            <div className="wthree-pro">
              <h2>Login Here</h2>
            </div>
            <form action="#" method="post">
              <div className="input-container">
                <input
                  placeholder="Username or E-mail"
                  name="Name"
                  className="user"
                  type="email"
                  required
                />
                <span className="icon1">
                  <i className="fa fa-user" aria-hidden="true"></i>
                </span>
              </div>

              <div className="input-container">
                <input
                  placeholder="Password"
                  name="Password"
                  className="pass"
                  type="password"
                  required
                />
                <span className="icon2">
                  <i className="fa fa-unlock" aria-hidden="true"></i>
                </span>
              </div>

              <div className="sub-w3l">
                <h6>
                <Link to="/forgot-password">Forgot Password?</Link>
                </h6>
                <div className="right-w3l">
                  <input type="submit" value="Login" />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
