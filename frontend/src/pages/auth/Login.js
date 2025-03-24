import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import InputAuth from "../../components/auth/InputAuth";
import ButtonAuth from "../../components/auth/ButtonAuth";
import videoBg from "../../public/auth/Ipad.mp4";


const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
    try {
      const response = await axios.post("http://localhost:80/api/login", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      alert("Đăng nhập thành công!");
      localStorage.setItem("token", response.data.access_token);

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      setError(error.response?.data?.message || "Đăng nhập thất bại!");
    }
  };
  return (
  <div className="video-container">
    <video autoPlay loop muted className="background-video">
      <source src={videoBg} type="video/mp4" />
    </video>

    <div className="content">
      <div className="main-content-agile">
        <div className="sub-main-w3">
          <div className="wthree-pro">
            <h2>Login Here</h2>
          </div>
          <form onSubmit={handleSubmit}>
            <InputAuth
              type="email"
              placeholder="Username or E-mail"
              name="email"
              iconClass="fa fa-user"
              value={formData.email}
              onChange={handleChange} // Gán sự kiện thay đổi input
            />
            <InputAuth
              type="password"
              placeholder="Password"
              name="password"
              iconClass="fa fa-unlock"
              value={formData.password}
              onChange={handleChange} // Gán sự kiện thay đổi input
            />

            {error && <p style={{ color: "red" }}>{error}</p>}

            <div className="sub-w3l">
              <h6>
                <Link to="/forgot-password">Forgot Password?</Link>
              </h6>
              <ButtonAuth type="submit" value="Login" />
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  );
};

export default LoginForm;
