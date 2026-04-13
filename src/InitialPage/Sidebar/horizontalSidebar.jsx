import React, { useState } from "react";
import { Grid, User } from "react-feather";
import { Link } from "react-router-dom";

const HorizontalSidebar = () => {
  const normalizeUserId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object") {
      return (
        value.user_id ||
        value.userId ||
        value.userid ||
        value.id ||
        value._id ||
        value.$oid ||
        value.oid ||
        ""
      );
    }
    return String(value);
  };

  // Get userid from localStorage (use normalized value)
  const user = localStorage.getItem('users');
  let userid = '';
  if (user) {
    const userStorage = JSON.parse(user);
    userid =
      normalizeUserId(userStorage?.message?.user_id) ||
      normalizeUserId(userStorage?.message?.userId) ||
      normalizeUserId(userStorage?.message?.userid) ||
      normalizeUserId(userStorage?.message?.id) ||
      normalizeUserId(userStorage?.message);
  }
  const [isActive, setIsActive] = useState(false);
  const [isActive2, setIsActive2] = useState(false);
  const [isActive3, setIsActive3] = useState(false);
  const [isActive4, setIsActive4] = useState(false);
  const [isActive5, setIsActive5] = useState(false);
  const [isActive6, setIsActive6] = useState(false);
  const [isActive7, setIsActive7] = useState(false);

  const [subActive, setsubActive] = useState(false);
  const [subActive2, setsubActive2] = useState(false);
  const [subActive3, setsubActive3] = useState(false);
  const [subActive4, setsubActive4] = useState(false);
  const [subActive5, setsubActive5] = useState(false);
  const [subActive6, setsubActive6] = useState(false);
  const [subActive7, setsubActive7] = useState(false);
  const [subActive8, setsubActive8] = useState(false);
  const [subActive9, setsubActive9] = useState(false);
  const [subActive10, setsubActive10] = useState(false);
  const [subActive11, setsubActive11] = useState(false);
  const [subActive12, setsubActive12] = useState(false);
  const [subActive13, setsubActive13] = useState(false);
  const [subActive14, setSubActive14] = useState(false);
  const [subActive15, setSubActive15] = useState(false);
  const [subActive16, setSubActive16] = useState(false);
  const [subActive17, setSubActive17] = useState(false);
  const [subActive18, setSubActive18] = useState(false);
  const [subActive19, setSubActive19] = useState(false);
  const [subActive20, setSubActive20] = useState(false);
  const [subActive21, setSubActive21] = useState(false);
  const [subActive22, setSubActive22] = useState(false);
  const [subActive23, setSubActive23] = useState(false);
  const [subActive24, setSubActive24] = useState(false);
  const [subActive25, setSubActive25] = useState(false);
  const [subActive26, setSubActive26] = useState(false);

  const handleSubClick = () => {
    setsubActive(!subActive);
  };
  const handleSubClick2 = () => {
    setsubActive2(!subActive2);
  };
  const handleSubClick3 = () => {
    setsubActive3(!subActive3);
  };
  const handleSubClick4 = () => {
    setsubActive4(!subActive4);
  };
  const handleSubClick5 = () => {
    setsubActive5(!subActive5);
  };
  const handleSubClick6 = () => {
    setsubActive6(!subActive6);
  };
  const handleSubClick7 = () => {
    setsubActive7(!subActive7);
  };
  const handleSubClick8 = () => {
    setsubActive8(!subActive8);
  };
  const handleSubClick9 = () => {
    setsubActive9(!subActive9);
  };
  const handleSubClick10 = () => {
    setsubActive10(!subActive10);
  };
  const handleSubClick11 = () => {
    setsubActive11(!subActive11);
  };
  const handleSubClick12 = () => {
    setsubActive12(!subActive12);
  };
  const handleSubClick13 = () => {
    setsubActive13(!subActive13);
  };

  const handleSubClick14 = () => {
    setSubActive14(!subActive14);
  };

  const handleSubClick15 = () => {
    setSubActive15(!subActive15);
  };

  const handleSubClick16 = () => {
    setSubActive16(!subActive16);
  };

  const handleSubClick17 = () => {
    setSubActive17(!subActive17);
  };

  const handleSubClick18 = () => {
    setSubActive18(!subActive18);
  };

  const handleSubClick19 = () => {
    setSubActive19(!subActive19);
  };

  const handleSubClick20 = () => {
    setSubActive20(!subActive20);
  };

  const handleSubClick21 = () => {
    setSubActive21(!subActive21);
  };

  const handleSubClick22 = () => {
    setSubActive22(!subActive22);
  };

  const handleSubClick23 = () => {
    setSubActive23(!subActive23);
  };

  const handleSubClick24 = () => {
    setSubActive24(!subActive24);
  };

  const handleSubClick25 = () => {
    setSubActive25(!subActive25);
  };

  const handleSubClick26 = () => {
    setSubActive26(!subActive26);
  };

  const handleSelectClick = () => {
    setIsActive(!isActive);
    setIsActive2(false);
    setIsActive3(false);
    setIsActive4(false);
    setIsActive5(false);
    setIsActive6(false);
    setIsActive7(false);
  };
  const handleSelectClick2 = () => {
    setIsActive(false);
    setIsActive2(!isActive2);
    setIsActive3(false);
    setIsActive4(false);
    setIsActive5(false);
    setIsActive6(false);
    setIsActive7(false);
  };
  const handleSelectClick3 = () => {
    setIsActive(false);
    setIsActive2(false);
    setIsActive3(!isActive3);
    setIsActive4(false);
    setIsActive5(false);
    setIsActive6(false);
    setIsActive7(false);
  };
  const handleSelectClick4 = () => {
    setIsActive(false);
    setIsActive2(false);
    setIsActive3(false);
    setIsActive4(!isActive4);
    setIsActive5(false);
    setIsActive6(false);
    setIsActive7(false);
  };
  const handleSelectClick5 = () => {
    setIsActive(false);
    setIsActive2(false);
    setIsActive3(false);
    setIsActive4(false);
    setIsActive5(!isActive5);
    setIsActive6(false);
    setIsActive7(false);
  };
  const handleSelectClick6 = () => {
    setIsActive(false);
    setIsActive2(false);
    setIsActive3(false);
    setIsActive4(false);
    setIsActive5(false);
    setIsActive6(!isActive6);
    setIsActive7(false);
  };
  const handleSelectClick7 = () => {
    setIsActive(false);
    setIsActive2(false);
    setIsActive3(false);
    setIsActive4(false);
    setIsActive5(false);
    setIsActive6(false);
    setIsActive7(!isActive7);
  };

  return (
    <div className="sidebar horizontal-sidebar">
      <div id="sidebar-menu-3" className="sidebar-menu">
        <ul className="nav">
          <li className="submenu">
            <Link
              to="#"
              onClick={handleSelectClick}
              className={isActive ? "subdrop" : ""}
            >
              <Grid />
              <span> Main Menu</span> <span className="menu-arrow" />
            </Link>
            <ul style={{ display: isActive ? "block" : "none" }}>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick}
                  className={subActive ? "subdrop" : ""}
                >
                  <span>Dashboard</span> <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `/admin-dashboard?userid=${userid}` : "/admin-dashboard"}>Admin Dashboard</Link>
                  </li>
                  <li>
                    <Link to={userid ? `/timesheet-dashboard?userid=${userid}` : "/timesheet-dashboard"}>Timesheet Dashboard</Link>
                  </li>
                  <li>
                    <Link to={userid ? `sales-dashboard?userid=${userid}` : "sales-dashboard"} className="active">
                      Sales Dashboard
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link to="#">
                  <span>Application</span>
                  <span className="menu-arrow" />
                </Link>
                <ul>
                  <li>
                    <Link to={userid ? `chat?userid=${userid}` : "chat"}>Chat</Link>
                  </li>
                  <li className="submenu submenu-two">
                    <Link to="#">
                      <span>Call</span>
                      <span className="menu-arrow inside-submenu" />
                    </Link>
                    <ul>
                      <li>
                        <Link to={userid ? `video-call?userid=${userid}` : "video-call"}>Video Call</Link>
                      </li>
                      <li>
                        <Link to={userid ? `audio-call?userid=${userid}` : "audio-call"}>Audio Call</Link>
                      </li>
                      <li>
                        <Link to={userid ? `call-history?userid=${userid}` : "call-history"}>Call History</Link>
                      </li>
                    </ul>
                  </li>
                  <li>
                    <Link to={userid ? `calendar?userid=${userid}` : "calendar"}>Calendar</Link>
                  </li>
                  <li>
                    <Link to={userid ? `email?userid=${userid}` : "email"}>Email</Link>
                  </li>
                  <li>
                    <Link to={userid ? `todo?userid=${userid}` : "todo"}>To Do</Link>
                  </li>
                  <li>
                    <Link to={userid ? `notes?userid=${userid}` : "notes"}>Notes</Link>
                  </li>
                  <li>
                    <Link to={userid ? `file-manager?userid=${userid}` : "file-manager"}>File Manager</Link>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li className="submenu">
            <Link
              to="#"
              onClick={handleSelectClick2}
              className={isActive2 ? "subdrop" : ""}
            >
              <img src="assets/img/icons/product.svg" alt="img" />
              <span> Inventory </span> <span className="menu-arrow" />
            </Link>
            <ul style={{ display: isActive2 ? "block" : "none" }}>
              <li>
                <Link to={userid ? `product-list?userid=${userid}` : "product-list"}>
                  <span>Products</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `add-product?userid=${userid}` : "add-product"}>
                  <span>Create Product</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `expired-products?userid=${userid}` : "expired-products"}>
                  <span>Expired Products</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `low-stocks?userid=${userid}` : "low-stocks"}>
                  <span>Low Stocks</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `category-list?userid=${userid}` : "category-list"}>
                  <span>Category</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `sub-categories?userid=${userid}` : "sub-categories"}>
                  <span>Sub Category</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `brand-list?userid=${userid}` : "brand-list"}>
                  <span>Brands</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `units?userid=${userid}` : "units"}>
                  <span>Units</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `varriant-attributes?userid=${userid}` : "varriant-attributes"}>
                  <span>Variant Attributes</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `warranty?userid=${userid}` : "warranty"}>
                  <span>Warranties</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `barcode?userid=${userid}` : "barcode"}>
                  <span>Print Barcode</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `qrcode?userid=${userid}` : "qrcode"}>
                  <span>Print QR Code</span>
                </Link>
              </li>
            </ul>
          </li>
          <li className="submenu">
            <Link
              to="#"
              onClick={handleSelectClick3}
              className={isActive3 ? "subdrop" : ""}
            >
              <img src="assets/img/icons/purchase1.svg" alt="img" />
              <span>Sales &amp; Purchase</span> <span className="menu-arrow" />
            </Link>
            <ul style={{ display: isActive3 ? "block" : "none" }}>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick2}
                  className={subActive2 ? "subdrop" : ""}
                >
                  <span>Sales</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive2 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `sales-list?userid=${userid}` : "sales-list"}>
                      <span>Sales</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `invoice-report?userid=${userid}` : "invoice-report"}>
                      <span>Invoices</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `sales-returns?userid=${userid}` : "sales-returns"}>
                      <span>Sales Return</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `quotation-list?userid=${userid}` : "quotation-list"}>
                      <span>Quotation</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `pos?userid=${userid}` : "pos"}>
                      <span>POS</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `coupons?userid=${userid}` : "coupons"}>
                      <span>Coupons</span>
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick3}
                  className={subActive3 ? "subdrop" : ""}
                >
                  <span>Purchase</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive3 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `purchase-list?userid=${userid}` : "purchase-list"}>
                      <span>Purchases</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `purchase-order-report?userid=${userid}` : "purchase-order-report"}>
                      <span>Purchase Order</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `purchase-returns?userid=${userid}` : "purchase-returns"}>
                      <span>Purchase Return</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `manage-stocks?userid=${userid}` : "manage-stocks"}>
                      <span>Manage Stock</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `stock-adjustment?userid=${userid}` : "stock-adjustment"}>
                      <span>Stock Adjustment</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `stock-transfer?userid=${userid}` : "stock-transfer"}>
                      <span>Stock Transfer</span>
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick4}
                  className={subActive4 ? "subdrop" : ""}
                >
                  <span>Expenses</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive4 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `expense-list?userid=${userid}` : "expense-list"}>Expenses</Link>
                  </li>
                  <li>
                    <Link to={userid ? `expense-category?userid=${userid}` : "expense-category"}>Expense Category</Link>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li className="submenu">
            <Link
              to="#"
              onClick={handleSelectClick4}
              className={isActive4 ? "subdrop" : ""}
            >
              <img src="assets/img/icons/users1.svg" alt="img" />
              <span>User Management</span> <span className="menu-arrow" />
            </Link>
            <ul style={{ display: isActive4 ? "block" : "none" }}>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick5}
                  className={subActive5 ? "subdrop" : ""}
                >
                  <span>People</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive5 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `customers?userid=${userid}` : "customers"}>
                      <span>Customers</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `suppliers?userid=${userid}` : "suppliers"}>
                      <span>Suppliers</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `store-list?userid=${userid}` : "store-list"}>
                      <span>Stores</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `warehouse?userid=${userid}` : "warehouse"}>
                      <span>Warehouses</span>
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick6}
                  className={subActive6 ? "subdrop" : ""}
                >
                  <span>Roles &amp; Permissions</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive6 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `roles-permissions?userid=${userid}` : "roles-permissions"}>
                      <span>Roles &amp; Permissions</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `delete-account?userid=${userid}` : "delete-account"}>
                      <span>Delete Account Request</span>
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick7}
                  className={subActive7 ? "subdrop" : ""}
                >
                  <span>Base UI</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive7 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `ui-alerts?userid=${userid}` : "ui-alerts"}>Alerts</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-accordion?userid=${userid}` : "ui-accordion"}>Accordion</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-avatar?userid=${userid}` : "ui-avatar"}>Avatar</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-badges?userid=${userid}` : "ui-badges"}>Badges</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-borders?userid=${userid}` : "ui-borders"}>Border</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-buttons?userid=${userid}` : "ui-buttons"}>Buttons</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-buttons-group?userid=${userid}` : "ui-buttons-group"}>Button Group</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-breadcrumb?userid=${userid}` : "ui-breadcrumb"}>Breadcrumb</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-cards?userid=${userid}` : "ui-cards"}>Card</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-carousel?userid=${userid}` : "ui-carousel"}>Carousel</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-colors?userid=${userid}` : "ui-colors"}>Colors</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-dropdowns?userid=${userid}` : "ui-dropdowns"}>Dropdowns</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-grid?userid=${userid}` : "ui-grid"}>Grid</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-images?userid=${userid}` : "ui-images"}>Images</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-lightbox?userid=${userid}` : "ui-lightbox"}>Lightbox</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-media?userid=${userid}` : "ui-media"}>Media</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-modals?userid=${userid}` : "ui-modals"}>Modals</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-offcanvas?userid=${userid}` : "ui-offcanvas"}>Offcanvas</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-pagination?userid=${userid}` : "ui-pagination"}>Pagination</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-popovers?userid=${userid}` : "ui-popovers"}>Popovers</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-progress?userid=${userid}` : "ui-progress"}>Progress</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-placeholders?userid=${userid}` : "ui-placeholders"}>Placeholders</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-rangeslider?userid=${userid}` : "ui-rangeslider"}>Range Slider</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-spinner?userid=${userid}` : "ui-spinner"}>Spinner</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-sweetalerts?userid=${userid}` : "ui-sweetalerts"}>Sweet Alerts</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-nav-tabs?userid=${userid}` : "ui-nav-tabs"}>Tabs</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-toasts?userid=${userid}` : "ui-toasts"}>Toasts</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-tooltips?userid=${userid}` : "ui-tooltips"}>Tooltips</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-typography?userid=${userid}` : "ui-typography"}>Typography</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-video?userid=${userid}` : "ui-video"}>Video</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick8}
                  className={subActive8 ? "subdrop" : ""}
                >
                  <span>Advanced UI</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive8 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `ui-ribbon?userid=${userid}` : "ui-ribbon"}>Ribbon</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-clipboard?userid=${userid}` : "ui-clipboard"}>Clipboard</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-drag-drop?userid=${userid}` : "ui-drag-drop"}>Drag &amp; Drop</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-rangeslider?userid=${userid}` : "ui-rangeslider"}>Range Slider</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-rating?userid=${userid}` : "ui-rating"}>Rating</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-text-editor?userid=${userid}` : "ui-text-editor"}>Text Editor</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-counter?userid=${userid}` : "ui-counter"}>Counter</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-scrollbar?userid=${userid}` : "ui-scrollbar"}>Scrollbar</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-stickynote?userid=${userid}` : "ui-stickynote"}>Sticky Note</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ui-timeline?userid=${userid}` : "ui-timeline"}>Timeline</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick9}
                  className={subActive9 ? "subdrop" : ""}
                >
                  <span>Charts</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive9 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `chart-apex?userid=${userid}` : "chart-apex"}>Apex Charts</Link>
                  </li>
                  <li>
                    <Link to={userid ? `chart-c3?userid=${userid}` : "chart-c3"}>Chart C3</Link>
                  </li>
                  <li>
                    <Link to={userid ? `chart-js?userid=${userid}` : "chart-js"}>Chart Js</Link>
                  </li>
                  <li>
                    <Link to={userid ? `chart-morris?userid=${userid}` : "chart-morris"}>Morris Charts</Link>
                  </li>
                  <li>
                    <Link to={userid ? `chart-flot?userid=${userid}` : "chart-flot"}>Flot Charts</Link>
                  </li>
                  <li>
                    <Link to={userid ? `chart-peity?userid=${userid}` : "chart-peity"}>Peity Charts</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick10}
                  className={subActive10 ? "subdrop" : ""}
                >
                  <span>Primary Icons</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive10 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `icon-fontawesome?userid=${userid}` : "icon-fontawesome"}>Fontawesome Icons</Link>
                  </li>
                  <li>
                    <Link to={userid ? `icon-feather?userid=${userid}` : "icon-feather"}>Feather Icons</Link>
                  </li>
                  <li>
                    <Link to={userid ? `icon-ionic?userid=${userid}` : "icon-ionic"}>Ionic Icons</Link>
                  </li>
                  <li>
                    <Link to={userid ? `icon-material?userid=${userid}` : "icon-material"}>Material Icons</Link>
                  </li>
                  <li>
                    <Link to={userid ? `icon-pe7?userid=${userid}` : "icon-pe7"}>Pe7 Icons</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick11}
                  className={subActive11 ? "subdrop" : ""}
                >
                  <span>Secondary Icons</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive11 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `icon-simpleline?userid=${userid}` : "icon-simpleline"}>Simpleline Icons</Link>
                  </li>
                  <li>
                    <Link to={userid ? `icon-themify?userid=${userid}` : "icon-themify"}>Themify Icons</Link>
                  </li>
                  <li>
                    <Link to={userid ? `icon-weather?userid=${userid}` : "icon-weather"}>Weather Icons</Link>
                  </li>
                  <li>
                    <Link to={userid ? `icon-typicon?userid=${userid}` : "icon-typicon"}>Typicon Icons</Link>
                  </li>
                  <li>
                    <Link to={userid ? `icon-flag?userid=${userid}` : "icon-flag"}>Flag Icons</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick12}
                  className={subActive12 ? "subdrop" : ""}
                >
                  <span> Forms</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive12 ? "block" : "none" }}>
                  <li className="submenu submenu-two">
                    <Link to="#">
                      <span>Form Elements</span>
                      <span className="menu-arrow inside-submenu" />
                    </Link>
                    <ul>
                      <li>
                        <Link to={userid ? `form-basic-inputs?userid=${userid}` : "form-basic-inputs"}>Basic Inputs</Link>
                      </li>
                      <li>
                        <Link to={userid ? `form-checkbox-radios?userid=${userid}` : "form-checkbox-radios"}>
                          Checkbox &amp; Radios
                        </Link>
                      </li>
                      <li>
                        <Link to={userid ? `form-input-groups?userid=${userid}` : "form-input-groups"}>Input Groups</Link>
                      </li>
                      <li>
                        <Link to={userid ? `form-grid-gutters?userid=${userid}` : "form-grid-gutters"}>Grid &amp; Gutters</Link>
                      </li>
                      <li>
                        <Link to={userid ? `form-select?userid=${userid}` : "form-select"}>Form Select</Link>
                      </li>
                      <li>
                        <Link to={userid ? `form-mask?userid=${userid}` : "form-mask"}>Input Masks</Link>
                      </li>
                      <li>
                        <Link to={userid ? `form-fileupload?userid=${userid}` : "form-fileupload"}>File Uploads</Link>
                      </li>
                    </ul>
                  </li>
                  <li className="submenu submenu-two">
                    <Link to="#">
                      <span> Layouts</span>
                      <span className="menu-arrow inside-submenu" />
                    </Link>
                    <ul>
                      <li>
                        <Link to={userid ? `form-horizontal?userid=${userid}` : "form-horizontal"}>Horizontal Form</Link>
                      </li>
                      <li>
                        <Link to={userid ? `form-vertical?userid=${userid}` : "form-vertical"}>Vertical Form</Link>
                      </li>
                      <li>
                        <Link to={userid ? `form-floating-labels?userid=${userid}` : "form-floating-labels"}>Floating Labels</Link>
                      </li>
                    </ul>
                  </li>
                  <li>
                    <Link to={userid ? `form-validation?userid=${userid}` : "form-validation"}>Form Validation</Link>
                  </li>
                  <li>
                    <Link to={userid ? `form-select2?userid=${userid}` : "form-select2"}>Select2</Link>
                  </li>
                  <li>
                    <Link to={userid ? `form-wizard?userid=${userid}` : "form-wizard"}>Form Wizard</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick13}
                  className={subActive13 ? "subdrop" : ""}
                >
                  <span>Tables</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive13 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `tables-basic?userid=${userid}` : "tables-basic"}>Basic Tables </Link>
                  </li>
                  <li>
                    <Link to={userid ? `data-tables?userid=${userid}` : "data-tables"}>Data Table </Link>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li className="submenu">
            <Link
              to="#"
              onClick={handleSelectClick5}
              className={isActive5 ? "subdrop" : ""}
            >
              <User />
              <span>Profile</span> <span className="menu-arrow" />
            </Link>
            <ul style={{ display: isActive5 ? "block" : "none" }}>
              <li>
                <Link to={userid ? `profile?userid=${userid}` : "profile"}>
                  <span>Profile</span>
                </Link>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick14}
                  className={subActive14 ? "subdrop" : ""}
                >
                  <span>Authentication</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive14 ? "block" : "none" }}>
                  <li className="submenu submenu-two">
                    <Link to="#">
                      Login
                      <span className="menu-arrow inside-submenu" />
                    </Link>
                    <ul>
                      <li>
                        <Link to={userid ? `signin?userid=${userid}` : "signin"}>Cover</Link>
                      </li>
                      <li>
                        <Link to={userid ? `signin-2?userid=${userid}` : "signin-2"}>Illustration</Link>
                      </li>
                      <li>
                        <Link to={userid ? `signin-3?userid=${userid}` : "signin-3"}>Basic</Link>
                      </li>
                    </ul>
                  </li>
                  <li className="submenu submenu-two">
                    <Link to="#">
                      Register
                      <span className="menu-arrow inside-submenu" />
                    </Link>
                    <ul>
                      <li>
                        <Link to={userid ? `register?userid=${userid}` : "register"}>Cover</Link>
                      </li>
                      <li>
                        <Link to={userid ? `register-2?userid=${userid}` : "register-2"}>Illustration</Link>
                      </li>
                      <li>
                        <Link to={userid ? `register-3?userid=${userid}` : "register-3"}>Basic</Link>
                      </li>
                    </ul>
                  </li>
                  <li className="submenu submenu-two">
                    <Link to="#">
                      Forgot Password
                      <span className="menu-arrow inside-submenu" />
                    </Link>
                    <ul>
                      <li>
                        <Link to={userid ? `forgot-password?userid=${userid}` : "forgot-password"}>Cover</Link>
                      </li>
                      <li>
                        <Link to={userid ? `forgot-password-2?userid=${userid}` : "forgot-password-2"}>Illustration</Link>
                      </li>
                      <li>
                        <Link to={userid ? `forgot-password-3?userid=${userid}` : "forgot-password-3"}>Basic</Link>
                      </li>
                    </ul>
                  </li>
                  <li className="submenu submenu-two">
                    <Link to="#">
                      Reset Password
                      <span className="menu-arrow inside-submenu" />
                    </Link>
                    <ul>
                      <li>
                        <Link to={userid ? `reset-password?userid=${userid}` : "reset-password"}>Cover</Link>
                      </li>
                      <li>
                        <Link to={userid ? `reset-password-2?userid=${userid}` : "reset-password-2"}>Illustration</Link>
                      </li>
                      <li>
                        <Link to={userid ? `reset-password-3?userid=${userid}` : "reset-password-3"}>Basic</Link>
                      </li>
                    </ul>
                  </li>
                  <li className="submenu submenu-two">
                    <Link to="#">
                      Email Verification
                      <span className="menu-arrow inside-submenu" />
                    </Link>
                    <ul>
                      <li>
                        <Link to={userid ? `email-verification?userid=${userid}` : "email-verification"}>Cover</Link>
                      </li>
                      <li>
                        <Link to={userid ? `email-verification-2?userid=${userid}` : "email-verification-2"}>Illustration</Link>
                      </li>
                      <li>
                        <Link to={userid ? `email-verification-3?userid=${userid}` : "email-verification-3"}>Basic</Link>
                      </li>
                    </ul>
                  </li>
                  <li className="submenu submenu-two">
                    <Link to="#">
                      2 Step Verification
                      <span className="menu-arrow inside-submenu" />
                    </Link>
                    <ul>
                      <li>
                        <Link to={userid ? `two-step-verification?userid=${userid}` : "two-step-verification"}>Cover</Link>
                      </li>
                      <li>
                        <Link to={userid ? `two-step-verification-2?userid=${userid}` : "two-step-verification-2"}>Illustration</Link>
                      </li>
                      <li>
                        <Link to={userid ? `two-step-verification-3?userid=${userid}` : "two-step-verification-3"}>Basic</Link>
                      </li>
                    </ul>
                  </li>
                  <li>
                    <Link to={userid ? `lock-screen?userid=${userid}` : "lock-screen"}>Lock Screen</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick15}
                  className={subActive15 ? "subdrop" : ""}
                >
                  <span>Pages</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive15 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `error-404?userid=${userid}` : "error-404"}>404 Error </Link>
                  </li>
                  <li>
                    <Link to={userid ? `error-500?userid=${userid}` : "error-500"}>500 Error </Link>
                  </li>
                  <li>
                    <Link to={userid ? `blank-page?userid=${userid}` : "blank-page"}>
                      <span>Blank Page</span>{" "}
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `coming-soon?userid=${userid}` : "coming-soon"}>
                      <span>Coming Soon</span>{" "}
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `under-maintenance?userid=${userid}` : "under-maintenance"}>
                      <span>Under Maintenance</span>{" "}
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick16}
                  className={subActive16 ? "subdrop" : ""}
                >
                  <span>Places</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive16 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `countries?userid=${userid}` : "countries"}>Countries</Link>
                  </li>
                  <li>
                    <Link to={userid ? `states?userid=${userid}` : "states"}>States</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick17}
                  className={subActive17 ? "subdrop" : ""}
                >
                  <span>Employees</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive17 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `employees-grid?userid=${userid}` : "employees-grid"}>
                      <span>Employees</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `department-grid?userid=${userid}` : "department-grid"}>
                      <span>Departments</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `designation?userid=${userid}` : "designation"}>
                      <span>Designation</span>
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `shift?userid=${userid}` : "shift"}>
                      <span>Shifts</span>
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick18}
                  className={subActive18 ? "subdrop" : ""}
                >
                  <span>Attendence</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive18 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `attendance-employee?userid=${userid}` : "attendance-employee"}>Employee Attendence</Link>
                  </li>
                  <li>
                    <Link to={userid ? `attendance-admin?userid=${userid}` : "attendance-admin"}>Admin Attendence</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick19}
                  className={subActive19 ? "subdrop" : ""}
                >
                  <span>Leaves &amp; Holidays</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive19 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `leaves-admin?userid=${userid}` : "leaves-admin"}>Admin Leaves</Link>
                  </li>
                  <li>
                    <Link to={userid ? `leaves-employee?userid=${userid}` : "leaves-employee"}>Employee Leaves</Link>
                  </li>
                  <li>
                    <Link to={userid ? `leave-types?userid=${userid}` : "leave-types"}>Leave Types</Link>
                  </li>
                  <li>
                    <Link to={userid ? `holidays?userid=${userid}` : "holidays"}>
                      <span>Holidays</span>
                    </Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to={userid ? `payroll-list?userid=${userid}` : "payroll-list"}
                  onClick={handleSubClick20}
                  className={subActive20 ? "subdrop" : ""}
                >
                  <span>Payroll</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive20 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `payroll-list?userid=${userid}` : "payroll-list"}>Employee Salary</Link>
                  </li>
                  <li>
                    <Link to={userid ? `payslip?userid=${userid}` : "payslip"}>Payslip</Link>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li className="submenu">
            <Link
              to="#"
              onClick={handleSelectClick6}
              className={isActive6 ? "subdrop" : ""}
            >
              <img src="assets/img/icons/printer.svg" alt="img" />
              <span>Reports</span> <span className="menu-arrow" />
            </Link>
            <ul style={{ display: isActive6 ? "block" : "none" }}>
              <li>
                <Link to={userid ? `sales-report?userid=${userid}` : "sales-report"}>
                  <span>Sales Report</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `purchase-report?userid=${userid}` : "purchase-report"}>
                  <span>Purchase report</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `inventory-report?userid=${userid}` : "inventory-report"}>
                  <span>Inventory Report</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `invoice-report?userid=${userid}` : "invoice-report"}>
                  <span>Invoice Report</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `supplier-report?userid=${userid}` : "supplier-report"}>
                  <span>Supplier Report</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `customer-report?userid=${userid}` : "customer-report"}>
                  <span>Customer Report</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `expense-report?userid=${userid}` : "expense-report"}>
                  <span>Expense Report</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `income-report?userid=${userid}` : "income-report"}>
                  <span>Income Report</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `tax-reports?userid=${userid}` : "tax-reports"}>
                  <span>Tax Report</span>
                </Link>
              </li>
              <li>
                <Link to={userid ? `profit-and-loss?userid=${userid}` : "profit-and-loss"}>
                  <span>Profit &amp; Loss</span>
                </Link>
              </li>
            </ul>
          </li>
          <li className="submenu">
            <Link
              to="#"
              onClick={handleSelectClick7}
              className={isActive7 ? "subdrop" : ""}
            >
              <img src="assets/img/icons/settings.svg" alt="img" />
              <span> Settings</span> <span className="menu-arrow" />
            </Link>
            <ul style={{ display: isActive7 ? "block" : "none" }}>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick21}
                  className={subActive21 ? "subdrop" : ""}
                >
                  <span>General Settings</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive21 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `general-settings?userid=${userid}` : "general-settings"}>Profile</Link>
                  </li>
                  <li>
                    <Link to={userid ? `security-settings?userid=${userid}` : "security-settings"}>Security</Link>
                  </li>
                  <li>
                    <Link to={userid ? `notification?userid=${userid}` : "notification"}>Notifications</Link>
                  </li>
                  <li>
                    <Link to={userid ? `connected-apps?userid=${userid}` : "connected-apps"}>Connected Apps</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick22}
                  className={subActive22 ? "subdrop" : ""}
                >
                  <span>Website Settings</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive22 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `system-settings?userid=${userid}` : "system-settings"}>System Settings</Link>
                  </li>
                  <li>
                    <Link to={userid ? `company-settings?userid=${userid}` : "company-settings"}>Company Settings </Link>
                  </li>
                  <li>
                    <Link to={userid ? `localization-settings?userid=${userid}` : "localization-settings"}>Localization</Link>
                  </li>
                  <li>
                    <Link to={userid ? `prefixes?userid=${userid}` : "prefixes"}>Prefixes</Link>
                  </li>
                  <li>
                    <Link to={userid ? `preference?userid=${userid}` : "preference"}>Preference</Link>
                  </li>
                  <li>
                    <Link to={userid ? `appearance?userid=${userid}` : "appearance"}>Appearance</Link>
                  </li>
                  <li>
                    <Link to={userid ? `social-authentication?userid=${userid}` : "social-authentication"}>
                      Social Authentication
                    </Link>
                  </li>
                  <li>
                    <Link to={userid ? `language-settings?userid=${userid}` : "language-settings"}>Language</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick23}
                  className={subActive23 ? "subdrop" : ""}
                >
                  <span>App Settings</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive23 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `invoice-settings?userid=${userid}` : "invoice-settings"}>Invoice</Link>
                  </li>
                  <li>
                    <Link to={userid ? `printer-settings?userid=${userid}` : "printer-settings"}>Printer</Link>
                  </li>
                  <li>
                    <Link to={userid ? `pos-settings?userid=${userid}` : "pos-settings"}>POS</Link>
                  </li>
                  <li>
                    <Link to={userid ? `custom-fields?userid=${userid}` : "custom-fields"}>Custom Fields</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick23}
                  className={subActive23 ? "subdrop" : ""}
                >
                  <span>System Settings</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive23 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `email-settings?userid=${userid}` : "email-settings"}>Email</Link>
                  </li>
                  <li>
                    <Link to={userid ? `sms-gateway?userid=${userid}` : "sms-gateway"}>SMS Gateways</Link>
                  </li>
                  <li>
                    <Link to={userid ? `otp-settings?userid=${userid}` : "otp-settings"}>OTP</Link>
                  </li>
                  <li>
                    <Link to={userid ? `gdpr-settings?userid=${userid}` : "gdpr-settings"}>GDPR Cookies</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick24}
                  className={subActive24 ? "subdrop" : ""}
                >
                  <span>Financial Settings</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive24 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `payment-gateway-settings?userid=${userid}` : "payment-gateway-settings"}>Payment Gateway</Link>
                  </li>
                  <li>
                    <Link to={userid ? `bank-settings-grid?userid=${userid}` : "bank-settings-grid"}>Bank Accounts</Link>
                  </li>
                  <li>
                    <Link to={userid ? `tax-rates?userid=${userid}` : "tax-rates"}>Tax Rates</Link>
                  </li>
                  <li>
                    <Link to={userid ? `currency-settings?userid=${userid}` : "currency-settings"}>Currencies</Link>
                  </li>
                </ul>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick25}
                  className={subActive25 ? "subdrop" : ""}
                >
                  <span>Other Settings</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive25 ? "block" : "none" }}>
                  <li>
                    <Link to={userid ? `storage-settings?userid=${userid}` : "storage-settings"}>Storage</Link>
                  </li>
                  <li>
                    <Link to={userid ? `ban-ip-address?userid=${userid}` : "ban-ip-address"}>Ban IP Address</Link>
                  </li>
                </ul>
              </li>
              <li>
                <Link to="#">
                  <span>Documentation</span>
                </Link>
              </li>
              <li>
                <Link to="#">
                  <span>Changelog v2.0.7</span>
                </Link>
              </li>
              <li className="submenu">
                <Link
                  to="#"
                  onClick={handleSubClick26}
                  className={subActive26 ? "subdrop" : ""}
                >
                  <span>Multi Level</span>
                  <span className="menu-arrow" />
                </Link>
                <ul style={{ display: subActive26 ? "block" : "none" }}>
                  <li>
                    <Link to="#">Level 1.1</Link>
                  </li>
                  <li className="submenu submenu-two">
                    <Link to="#">
                      Level 1.2
                      <span className="menu-arrow inside-submenu" />
                    </Link>
                    <ul>
                      <li>
                        <Link to="#">Level 2.1</Link>
                      </li>
                      <li className="submenu submenu-two submenu-three">
                        <Link to="#">
                          Level 2.2
                          <span className="menu-arrow inside-submenu inside-submenu-two" />
                        </Link>
                        <ul>
                          <li>
                            <Link to="#">Level 3.1</Link>
                          </li>
                          <li>
                            <Link to="#">Level 3.2</Link>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HorizontalSidebar;
