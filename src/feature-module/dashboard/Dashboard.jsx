import React, { useState, useEffect } from "react";
// import CountUp from "react-countup";
import {
  File,
  User,
  UserCheck,
  Calendar,
} from "feather-icons-react/build/IconComponents";
import DateRangePicker from "react-bootstrap-daterangepicker";
import Chart from "react-apexcharts";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../../core/img/imagewithbasebath";
import { ArrowRight } from "react-feather";
import { all_routes } from "../../Router/all_routes";
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";
import axios from "axios";
import config from "../../config";

const Dashboard = () => {
  const route = all_routes;
  const [chartOptions] = useState({
    series: [
      {
        name: "Sales",
        data: [130, 210, 300, 290, 150, 50, 210, 280, 105],
      },
      {
        name: "Purchase",
        data: [-150, -90, -50, -180, -50, -70, -100, -90, -105],
      },
    ],
    colors: ["#28C76F", "#EA5455"],
    chart: {
      type: "bar",
      height: 320,
      stacked: true,
      zoom: {
        enabled: true,
      },
    },
    responsive: [
      {
        breakpoint: 280,
        options: {
          legend: {
            position: "bottom",
            offsetY: 0,
          },
        },
      },
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        borderRadiusApplication: "end", // "around" / "end"
        borderRadiusWhenStacked: "all", // "all"/"last"
        columnWidth: "20%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    yaxis: {
      min: -200,
      max: 300,
      tickAmount: 5,
    },
    xaxis: {
      categories: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
      ],
    },
    legend: { show: false },
    fill: {
      opacity: 1,
    },
  });
  const MySwal = withReactContent(Swal);
  const showConfirmationAlert = () => {
    MySwal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      showCancelButton: true,
      confirmButtonColor: "#00ff00",
      confirmButtonText: "Yes, delete it!",
      cancelButtonColor: "#ff0000",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        MySwal.fire({
          title: "Deleted!",
          text: "Your file has been deleted.",
          className: "btn btn-success",
          confirmButtonText: "OK",
          customClass: {
            confirmButton: "btn btn-success",
          },
        });
      } else {
        MySwal.close();
      }
    });
  };

  const [data, setData] = useState('');
  const [dataPrinting, setDataPrinting] = useState('');
  const [dataDesign, setDataDesign] = useState('');
  const [dataDelivery, setDataDelivery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  console.log(data, loading, error);

  const fetchCSJobs = async () => {
    
    try {
      setLoading(true);

      const response = await axios.post(config.JobSummary.URL.TotalJobcount, {}, { 
        headers: {
          'Content-Type': 'application/json' 
        }
      });

      console.log("CS Data fetched successfully: ", response.data);

      setData(response.data);

      if (response.data && response.data[0].totalSqft) {
        setData(response.data[0]); // This should set jobs specific to the user
        console.log(response.data[0]);
        
      } else {
        setData({ totalSqft: 0 }); // No jobs found for the user
      }

    } catch (error) {
      console.error("Error fetching job data:", error.response ? error.response.data : error.message);
      setError("Error fetching job data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrintingJobs = async () => {

    try {
      setLoading(true);

      const response = await axios.post(config.Printing.URL.TotalPrintingJobcount, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log("Printing Data fetched successfully: ", response.data);

      setDataPrinting(response.data);

      if (response.data && response.data[0].totalPrintingSqft) {
        setDataPrinting(response.data[0]); // This should set jobs specific to the user
        console.log(response.data[0]);

      } else {
        setDataPrinting({ totalPrintingSqft: 0 }); // No jobs found for the user
      }

    } catch (error) {
      console.error("Error fetching job data:", error.response ? error.response.dataPrinting : error.message);
      setError("Error fetching job data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDesignJobs = async () => {

    try {
      setLoading(true);

      const response = await axios.post(config.Design.URL.TotalHoursWork, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log("Design fetched successfully: ", response.data);

      setDataDesign(response.data);

      if (response.data && response.data[0].totalDurationHours) {
        setDataDesign(response.data[0]); // This should set jobs specific to the user
        console.log(response.data[0]);

      } else {
        setDataDesign({ totalDurationHours: 0 }); // No jobs found for the user
      }

    } catch (error) {
      console.error("Error fetching job data:", error.response ? error.response.data : error.message);
      setError("Error fetching job data");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryJobs = async () => {

    try {
      setLoading(true);

      const response = await axios.post(config.Delivery.URL.Getalldeliveryjobs, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log("CS Data fetched successfully: ", response.data);

      setDataDelivery(response.data);

      if (response.data && response.data.totalJobDelivered) {
        setDataDelivery(response.data); // This should set jobs specific to the user
        console.log('data delivery: ', response.data);

      } else {
        setDataDelivery({ totalJobDelivered: 0 }); // No jobs found for the user
      }

    } catch (error) {
      console.error("Error fetching job data:", error.response ? error.response.data : error.message);
      setError("Error fetching job data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        // Fetch both jobs concurrently
        const [csJobs, printingJobs] = await Promise.all([
          fetchCSJobs(),       // Fetch CS Jobs
          fetchPrintingJobs(),
          fetchDesignJobs(),
          fetchDeliveryJobs()
        ]);
        // Handle successful response (if needed, you can set state here)
        console.log(csJobs, printingJobs);
      } catch (error) {
        // Handle error
        console.error("Error fetching jobs:", error);
      }
    };

    fetchJobs(); // Call the function to fetch data
  }, []);

  const initialSettings = {
    endDate: new Date("2020-08-11T12:30:00.000Z"),
    ranges: {
      "Last 30 Days": [
        new Date("2020-07-12T04:57:17.076Z"),
        new Date("2020-08-10T04:57:17.076Z"),
      ],
      "Last 7 Days": [
        new Date("2020-08-04T04:57:17.076Z"),
        new Date("2020-08-10T04:57:17.076Z"),
      ],
      "Last Month": [
        new Date("2020-06-30T18:30:00.000Z"),
        new Date("2020-07-31T18:29:59.999Z"),
      ],
      "This Month": [
        new Date("2020-07-31T18:30:00.000Z"),
        new Date("2020-08-31T18:29:59.999Z"),
      ],
      Today: [
        new Date("2020-08-10T04:57:17.076Z"),
        new Date("2020-08-10T04:57:17.076Z"),
      ],
      Yesterday: [
        new Date("2020-08-09T04:57:17.076Z"),
        new Date("2020-08-09T04:57:17.076Z"),
      ],
    },
    startDate: new Date("2020-08-04T04:57:17.076Z"), // Set "Last 7 Days" as default
    timePicker: false,
  };


  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          <div className="row">
            <div className="d-flex align-items-center top-right">
              <div className="position-relative daterange-wraper me-2">
                <div className="input-groupicon calender-input">
                  <DateRangePicker initialSettings={initialSettings}>
                    <input
                      className="form-control col-4 input-range"
                      type="text"
                    // style={{ border: "none" }}
                    />
                  </DateRangePicker>
                </div>
                <Calendar className="feather-14" />
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="dash-widget w-100">
                <div className="dash-widgetimg">
                  <span>
                    <ImageWithBasePath
                      src="assets/img/icons/dash1.svg"
                      alt="img"
                    />
                  </span>
                </div>
                <div className="dash-widgetcontent">
                  <h5>
                    {data.totalSqft}
                  </h5>
                  <h6>Job Upload Sq Ft</h6>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="dash-widget dash1 w-100">
                <div className="dash-widgetimg">
                  <span>
                    <ImageWithBasePath
                      src="assets/img/icons/dash2.svg"
                      alt="img"
                    />
                  </span>
                </div>
                <div className="dash-widgetcontent">
                  <h5>
                    {dataPrinting.totalPrintingSqft}
                  </h5>
                  <h6>Total Printing Sq Ft</h6>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="dash-widget dash2 w-100">
                <div className="dash-widgetimg">
                  <span>
                    <ImageWithBasePath
                      src="assets/img/icons/dash3.svg"
                      alt="img"
                    />
                  </span>
                </div>
                <div className="dash-widgetcontent">
                  <h5>
                    {dataDesign.totalDurationHours}
                  </h5>
                  <h6>Total Hours Work</h6>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="dash-widget dash3 w-100">
                <div className="dash-widgetimg">
                  <span>
                    <ImageWithBasePath
                      src="assets/img/icons/dash4.svg"
                      alt="img"
                    />
                  </span>
                </div>
                <div className="dash-widgetcontent">
                  <h5>
                    {dataDelivery.totalJobDelivered}
                  </h5>
                  <h6>Total Jobs Delivered</h6>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="dash-count">
                <div className="dash-counts">
                  <h4>100</h4>
                  <h5>Customers</h5>
                </div>
                <div className="dash-imgs">
                  <User />
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="dash-count das1">
                <div className="dash-counts">
                  <h4>110</h4>
                  <h5>Suppliers</h5>
                </div>
                <div className="dash-imgs">
                  <UserCheck />
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="dash-count das2">
                <div className="dash-counts">
                  <h4>150</h4>
                  <h5>Purchase Invoice</h5>
                </div>
                <div className="dash-imgs">
                  <ImageWithBasePath
                    src="assets/img/icons/file-text-icon-01.svg"
                    className="img-fluid"
                    alt="icon"
                  />
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="dash-count das3">
                <div className="dash-counts">
                  <h4>170</h4>
                  <h5>Sales Invoice</h5>
                </div>
                <div className="dash-imgs">
                  <File />
                </div>
              </div>
            </div>
          </div>
          {/* Button trigger modal */}

          <div className="row">
            <div className="col-xl-7 col-sm-12 col-12 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Purchase &amp; Sales</h5>
                  <div className="graph-sets">
                    <ul className="mb-0">
                      <li>
                        <span>Sales</span>
                      </li>
                      <li>
                        <span>Purchase</span>
                      </li>
                    </ul>
                    <div className="dropdown dropdown-wraper">
                      <button
                        className="btn btn-light btn-sm dropdown-toggle"
                        type="button"
                        id="dropdownMenuButton"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        2023
                      </button>
                      <ul
                        className="dropdown-menu"
                        aria-labelledby="dropdownMenuButton"
                      >
                        <li>
                          <Link to="#" className="dropdown-item">
                            2023
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item">
                            2022
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item">
                            2021
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div id="sales_charts" />
                  <Chart
                    options={chartOptions}
                    series={chartOptions.series}
                    type="bar"
                    height={320}
                  />
                </div>
              </div>
            </div>
            <div className="col-xl-5 col-sm-12 col-12 d-flex">
              <div className="card flex-fill default-cover mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h4 className="card-title mb-0">Recent Products</h4>
                  <div className="view-all-link">
                    <Link to="#" className="view-all d-flex align-items-center">
                      View All
                      <span className="ps-2 d-flex align-items-center">
                        <ArrowRight className="feather-16" />
                      </span>
                    </Link>
                  </div>
                </div>
                <div className="card-body">
                  <div className="table-responsive dataview">
                    <table className="table dashboard-recent-products">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Products</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1</td>
                          <td className="productimgname">
                            <Link
                              to={route.productlist}
                              className="product-img"
                            >
                              <ImageWithBasePath
                                src="assets/img/products/stock-img-01.png"
                                alt="product"
                              />
                            </Link>
                            <Link to={route.productlist}>
                              Lenevo 3rd Generation
                            </Link>
                          </td>
                          <td>$12500</td>
                        </tr>
                        <tr>
                          <td>2</td>
                          <td className="productimgname">
                            <Link
                              to={route.productlist}
                              className="product-img"
                            >
                              <ImageWithBasePath
                                src="assets/img/products/stock-img-06.png"
                                alt="product"
                              />
                            </Link>
                            <Link to={route.productlist}>Bold V3.2</Link>
                          </td>
                          <td>$1600</td>
                        </tr>
                        <tr>
                          <td>3</td>
                          <td className="productimgname">
                            <Link
                              to={route.productlist}
                              className="product-img"
                            >
                              <ImageWithBasePath
                                src="assets/img/products/stock-img-02.png"
                                alt="product"
                              />
                            </Link>
                            <Link to={route.productlist}>Nike Jordan</Link>
                          </td>
                          <td>$2000</td>
                        </tr>
                        <tr>
                          <td>4</td>
                          <td className="productimgname">
                            <Link
                              to={route.productlist}
                              className="product-img"
                            >
                              <ImageWithBasePath
                                src="assets/img/products/stock-img-03.png"
                                alt="product"
                              />
                            </Link>
                            <Link to={route.productlist}>
                              Apple Series 5 Watch
                            </Link>
                          </td>
                          <td>$800</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Expired Products</h4>
            </div>
            <div className="card-body">
              <div className="table-responsive dataview">
                <table className="table dashboard-expired-products">
                  <thead>
                    <tr>
                      <th className="no-sort">
                        <label className="checkboxs">
                          <input type="checkbox" id="select-all" />
                          <span className="checkmarks" />
                        </label>
                      </th>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Manufactured Date</th>
                      <th>Expired Date</th>
                      <th className="no-sort">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <label className="checkboxs">
                          <input type="checkbox" />
                          <span className="checkmarks" />
                        </label>
                      </td>
                      <td>
                        <div className="productimgname">
                          <Link to="#" className="product-img stock-img">
                            <ImageWithBasePath
                              src="assets/img/products/expire-product-01.png"
                              alt="product"
                            />
                          </Link>
                          <Link to="#">Red Premium Handy </Link>
                        </div>
                      </td>
                      <td>
                        <Link to="#">PT006</Link>
                      </td>
                      <td>17 Jan 2023</td>
                      <td>29 Mar 2023</td>
                      <td className="action-table-data">
                        <div className="edit-delete-action">
                          <Link className="me-2 p-2" to="#">
                            <i data-feather="edit" className="feather-edit" />
                          </Link>
                          <Link
                            className=" confirm-text p-2"
                            to="#"
                            onClick={showConfirmationAlert}
                          >
                            <i
                              data-feather="trash-2"
                              className="feather-trash-2"
                            />
                          </Link>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label className="checkboxs">
                          <input type="checkbox" />
                          <span className="checkmarks" />
                        </label>
                      </td>
                      <td>
                        <div className="productimgname">
                          <Link to="#" className="product-img stock-img">
                            <ImageWithBasePath
                              src="assets/img/products/expire-product-02.png"
                              alt="product"
                            />
                          </Link>
                          <Link to="#">Iphone 14 Pro</Link>
                        </div>
                      </td>
                      <td>
                        <Link to="#">PT007</Link>
                      </td>
                      <td>22 Feb 2023</td>
                      <td>04 Apr 2023</td>
                      <td className="action-table-data">
                        <div className="edit-delete-action">
                          <Link className="me-2 p-2" to="#">
                            <i data-feather="edit" className="feather-edit" />
                          </Link>
                          <Link
                            className="confirm-text p-2"
                            to="#"
                            onClick={showConfirmationAlert}
                          >
                            <i
                              data-feather="trash-2"
                              className="feather-trash-2"
                            />
                          </Link>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label className="checkboxs">
                          <input type="checkbox" />
                          <span className="checkmarks" />
                        </label>
                      </td>
                      <td>
                        <div className="productimgname">
                          <Link to="#" className="product-img stock-img">
                            <ImageWithBasePath
                              src="assets/img/products/expire-product-03.png"
                              alt="product"
                            />
                          </Link>
                          <Link to="#">Black Slim 200 </Link>
                        </div>
                      </td>
                      <td>
                        <Link to="#">PT008</Link>
                      </td>
                      <td>18 Mar 2023</td>
                      <td>13 May 2023</td>
                      <td className="action-table-data">
                        <div className="edit-delete-action">
                          <Link className="me-2 p-2" to="#">
                            <i data-feather="edit" className="feather-edit" />
                          </Link>
                          <Link
                            className=" confirm-text p-2"
                            to="#"
                            onClick={showConfirmationAlert}
                          >
                            <i
                              data-feather="trash-2"
                              className="feather-trash-2"
                            />
                          </Link>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label className="checkboxs">
                          <input type="checkbox" />
                          <span className="checkmarks" />
                        </label>
                      </td>
                      <td>
                        <div className="productimgname">
                          <Link to="#" className="product-img stock-img">
                            <ImageWithBasePath
                              src="assets/img/products/expire-product-04.png"
                              alt="product"
                            />
                          </Link>
                          <Link to="#">Woodcraft Sandal</Link>
                        </div>
                      </td>
                      <td>
                        <Link to="#">PT009</Link>
                      </td>
                      <td>29 Mar 2023</td>
                      <td>27 May 2023</td>
                      <td className="action-table-data">
                        <div className="edit-delete-action">
                          <Link className="me-2 p-2" to="#">
                            <i data-feather="edit" className="feather-edit" />
                          </Link>
                          <Link
                            className=" confirm-text p-2"
                            to="#"
                            onClick={showConfirmationAlert}
                          >
                            <i
                              data-feather="trash-2"
                              className="feather-trash-2"
                            />
                          </Link>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <label className="checkboxs">
                          <input type="checkbox" />
                          <span className="checkmarks" />
                        </label>
                      </td>
                      <td>
                        <div className="productimgname">
                          <Link to="#" className="product-img stock-img">
                            <ImageWithBasePath
                              src="assets/img/products/stock-img-03.png"
                              alt="product"
                            />
                          </Link>
                          <Link to="#">Apple Series 5 Watch </Link>
                        </div>
                      </td>
                      <td>
                        <Link to="#">PT010</Link>
                      </td>
                      <td>24 Mar 2023</td>
                      <td>26 May 2023</td>
                      <td className="action-table-data">
                        <div className="edit-delete-action">
                          <Link
                            className="me-2 p-2"
                            to="#"
                            data-bs-toggle="modal"
                            data-bs-target="#edit-units"
                          >
                            <i data-feather="edit" className="feather-edit" />
                          </Link>
                          <Link
                            className=" confirm-text p-2"
                            to="#"
                            onClick={showConfirmationAlert}
                          >
                            <i
                              data-feather="trash-2"
                              className="feather-trash-2"
                            />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
