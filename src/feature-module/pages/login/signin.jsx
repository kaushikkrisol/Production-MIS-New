import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../../Router/all_routes";
import axios from "axios";
import config from "../../../config"; // Import the config file


const Signin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();


  const togglePasswordVisibility = () => {
    setPasswordVisible((prevState) => !prevState);
  };

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent default form submission

    try {
      const response = await axios.post(config.User.URL.Checkuser, {
        Username: email,
        password: password,
      });

      // Check if the login was successful
      if (response.data) {
        localStorage.setItem('users', JSON.stringify(response.data));
        console.log("users,", response.data);

        navigate(all_routes.datatable); // Navigate to dashboard if successful

      } else {
        setErrorMessage(response.data.message || "Invalid login credentials");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Error logging in. Please try again."
      );
    }
  };
 
  
  return (
    <div className="main-wrapper">
      <div className="account-content">
        <div className="login-wrapper" style={{ marginLeft: "500px" }}>
          <div className="login-content">
            <form onSubmit={handleLogin}>
              <div className="login-userset">
                <div className="login-logo logo-normal">
                  <h1>Comart</h1>
                </div>
                <Link to={all_routes.dashboard} className="login-logo logo-white">
                  <h1>Comart</h1>
                </Link>
                <div className="login-userheading">
                  <h3>Sign In</h3>
                </div>
                <div className="form-login mb-3">
                  <label className="form-label">UserName</label>
                  <div className="form-addons">
                    <input
                      type="text"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <span className="feather icon-mail" aria-hidden="true" />
                  </div>
                </div>
                <div className="form-login mb-3">
                  <label className="form-label">Password</label>
                  <div className="pass-group">
                    <input
                      type={isPasswordVisible ? "text" : "password"}
                      className="pass-input form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <span
                      className={`fas toggle-password ${isPasswordVisible ? "fa-eye" : "fa-eye-slash"
                        }`}
                      onClick={togglePasswordVisibility}
                    ></span>
                  </div>
                </div>
                {errorMessage && (
                  <div className="alert alert-danger">{errorMessage}</div>
                )}
                <div className="form-login authentication-check">
                  <div className="row">
                    <div className="col-12 d-flex align-items-center justify-content-between">
                      <div className="custom-control custom-checkbox">
                        {/* <label className="checkboxs ps-4 mb-0 pb-0 line-height-1">
                          <input type="checkbox" className="form-control" />
                          <span className="checkmarks" />
                          Remember me
                        </label> */}
                      </div>
                      <div className="text-end">
                        {/* <Link className="forgot-link" to={all_routes.forgotPassword}>
                          Forgot Password?
                        </Link> */}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="form-login">
                  <button type="submit" className="btn btn-login">
                    Sign In
                  </button>
                </div>
                <div className="my-4 d-flex justify-content-center align-items-center copyright-text">
                  <p>
                    Copyright © 2026 Krisol Infosoft Pvt Ltd. All rights reserved
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signin;
