import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AdminLink } from "../Protect/HiddenLink";

const PageMenu = () => {
  const location = useLocation();

  return (
    <>
      {location.pathname === "/profile" ? (
        <div>
          <nav className="w-[400px] md:w-[600px] bg-blue-600 rounded-lg  mb-4">
            <ul className="flex gap-[20px] justify-center p-2  items-center ">
              <li className="text-[#fff] ">
                <NavLink to="/profile">Profile</NavLink>
              </li>
              <li className="text-[#fff] ">
                <NavLink to="/change-password">Change Password</NavLink>
              </li>
              <AdminLink>
              
                <li className="text-[#fff] ">
                  <NavLink to="/users">Users</NavLink>
                </li>

              </AdminLink>
            </ul>
          </nav>
        </div>
      ) : (
        <div>
          <nav className="w-[100%]  rounded-lg  mb-4">
            <ul className="flex gap-[20px] justify-center p-2  items-center ">
              <li className="text-[#fff] ">
                {/* <NavLink to="/profile">Profile</NavLink> */}
              </li>
              <li className="text-[#000] font-bold text-xl ">
                <NavLink to="/change-password">Change Password.</NavLink>
              </li>
              <AdminLink>
                <li className="text-[#fff] ">
                  {/* <NavLink to="/users">Users</NavLink> */}
                </li>
              </AdminLink>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
};

export default PageMenu;
