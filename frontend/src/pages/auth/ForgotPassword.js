import React from "react";
import { Link } from "react-router-dom";
import "../../public/auth/login.css"; 
import videoBg from "../../public/auth/Ipad.mp4";
import InputAuth from "../../components/auth/InputAuth";

const ForgotPassword = () => {
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
              <h2>Forgot Password</h2>
            </div>
            <form action="#" method="post">
            <InputAuth type="email" placeholder="Enter your email" name="email" iconClass="fa fa-envelope" />
              <div className="sub-w3l">
                <h6>
                  <Link to="/login">Back to Login</Link>
                </h6>
                <div className="right-w3l">
                  <input type="submit" value="Reset Password" />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
