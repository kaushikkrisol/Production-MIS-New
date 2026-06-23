import React, { lazy, Suspense, useEffect, useState } from "react";
import Scrollbars from "react-custom-scrollbars-2";
import { Link, useLocation } from "react-router-dom";
import { SidebarData } from "../../core/json/siderbar_data";

const HorizontalSidebar = lazy(() => import("./horizontalSidebar"));
const CollapsedSidebar = lazy(() => import("./collapsedSidebar"));

const Sidebar = () => {

  const Location = useLocation();


  const [subOpen, setSubopen] = useState("");
  const [subsidebar, setSubsidebar] = useState("");
  const [layoutStyle, setLayoutStyle] = useState(() =>
    localStorage.getItem("layoutStyling") ||
    document.documentElement.getAttribute("data-layout-style") ||
    "default"
  );

  useEffect(() => {
    const updateLayoutStyle = () => {
      setLayoutStyle(
        localStorage.getItem("layoutStyling") ||
          document.documentElement.getAttribute("data-layout-style") ||
          "default"
      );
    };

    const observer = new MutationObserver(updateLayoutStyle);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-layout-style"],
    });
    window.addEventListener("storage", updateLayoutStyle);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", updateLayoutStyle);
    };
  }, []);

  useEffect(() => {
    const activeMenu = SidebarData?.flatMap((mainLabel) => mainLabel?.submenuItems || []).find(
      (title) => {
        const childLinks =
          title?.submenuItems?.flatMap((item) => [
            item?.link,
            ...(item?.submenuItems?.map((subItem) => subItem?.link) || []),
          ]) || [];

        return title?.link === Location.pathname || childLinks.includes(Location.pathname);
      }
    );

    if (activeMenu?.submenu) {
      setSubopen(activeMenu.label);
    }
  }, [Location.pathname]);

  const toggleSidebar = (title) => {
    if (title == subOpen) {
      setSubopen("");
    } else {
      setSubopen(title);
    }
  };

  const toggleSubsidebar = (subitem) => {
    if (subitem == subsidebar) {
      setSubsidebar("");
    } else {
      setSubsidebar(subitem);
    }
  };

  return (
    <div>
      <div className="sidebar" id="sidebar">
        <Scrollbars>
          <div className="sidebar-inner slimscroll">
            <div id="sidebar-menu" className="sidebar-menu">
              <ul>
                {SidebarData?.map((mainLabel, index) => (
                  <li className="submenu-open" key={index}>
                    <h6 className="submenu-hdr">{mainLabel?.label}</h6>
                    <ul>
                      {mainLabel?.submenuItems?.map((title, i) => {
                        let link_array = [];
                        title?.submenuItems?.map((link) => {
                          link_array.push(link?.link);
                          if (link?.submenu) {
                            link?.submenuItems?.map((item) => {
                              link_array.push(item?.link);
                            });
                          }
                          return link_array;
                        });
                        title.links = link_array;
                        return (
                          <React.Fragment key={i}>
                            {" "}
                            <li
                              className={`submenu ${
                                !title?.submenu &&
                                Location.pathname === title?.link
                                  ? "custom-active-hassubroute-false"
                                  : ""
                              }`}
                            >
                              <Link
                                to={title?.submenu ? "#" : title?.link}
                                onClick={(event) => {
                                  if (title?.submenu) {
                                    event.preventDefault();
                                  }
                                  toggleSidebar(title?.label);
                                }}
                                className={`${
                                  subOpen === title?.label ? "subdrop" : ""
                                } ${
                                  title?.links?.includes(Location.pathname)
                                    ? "active"
                                    : ""
                                }`}
                              >
                                {title?.icon}
                                <span className="custom-active-span">
                                  {title?.label}
                                </span>
                                {title?.submenu && (
                                  <span className="menu-arrow" />
                                )}
                              </Link>
                              <ul
                                style={{
                                  display:
                                    subOpen === title?.label ? "block" : "none",
                                }}
                              >
                                {title?.submenuItems?.map(
                                  (item, titleIndex) => (
                                    <li
                                      className="submenu submenu-two"
                                      key={titleIndex}
                                    >
                                      <Link
                                        to={item?.link}
                                        className={`${
                                          item?.submenuItems
                                            ?.map((link) => link.link)
                                            .includes(Location.pathname) ||
                                          item?.link === Location.pathname
                                            ? "active"
                                            : ""
                                        } ${
                                          subsidebar === item?.label
                                            ? "subdrop"
                                            : ""
                                        }`}
                                        onClick={() =>
                                          toggleSubsidebar(item?.label)
                                        }
                                      >
                                        {item?.label}
                                        {item?.submenu && (
                                          <span className="menu-arrow inside-submenu" />
                                        )}
                                      </Link>
                                      <ul
                                        style={{
                                          display:
                                            subsidebar === item?.label
                                              ? "block"
                                              : "none",
                                        }}
                                      >
                                        {item?.submenuItems?.map(
                                          (items, subIndex) => (
                                            <li key={subIndex}>
                                              <Link
                                                to={items?.link}
                                                className={`${
                                                  subsidebar === items?.label
                                                    ? "submenu-two subdrop"
                                                    : "submenu-two"
                                                } ${
                                                  items?.submenuItems
                                                    ?.map((link) => link.link)
                                                    .includes(
                                                      Location.pathname
                                                    ) ||
                                                  items?.link ===
                                                    Location.pathname
                                                    ? "active"
                                                    : ""
                                                }`}
                                              >
                                                {items?.label}
                                              </Link>
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </li>
                                  )
                                )}
                              </ul>
                            </li>
                          </React.Fragment>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Scrollbars>
      </div>
      <Suspense fallback={null}>
        {layoutStyle === "horizontal" && <HorizontalSidebar />}
        {layoutStyle === "collapsed" && <CollapsedSidebar />}
      </Suspense>
    </div>
  );
};

export default Sidebar;
