import React, { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
const ProductList = lazy(() => import("../feature-module/inventory/productlist"));
const Dashboard = lazy(() => import("../feature-module/dashboard/Dashboard"));
const TimesheetDashboard = lazy(() => import("../feature-module/dashboard/TimesheetDashboard"));
const WhatsappDashboard = lazy(() => import("../feature-module/dashboard/WhatsappDashboard"));
const DesignerDashboard = lazy(() => import("../feature-module/dashboard/DesignerDashboard"));
const AddProduct = lazy(() => import("../feature-module/inventory/addproduct"));
const SalesDashbaord = lazy(() => import("../feature-module/dashboard/salesdashbaord"));
const BrandList = lazy(() => import("../feature-module/inventory/brandlist"));
const VariantAttributes = lazy(() => import("../feature-module/inventory/variantattributes"));
const Warranty = lazy(() => import("../feature-module/inventory/warranty"));
const PrintBarcode = lazy(() => import("../feature-module/inventory/printbarcode"));
const Grid = lazy(() => import("../feature-module/uiinterface/grid"));
const Images = lazy(() => import("../feature-module/uiinterface/images"));
const Lightboxes = lazy(() => import("../feature-module/uiinterface/lightbox"));
const Media = lazy(() => import("../feature-module/uiinterface/media"));
const Modals = lazy(() => import("../feature-module/uiinterface/modals"));
const Offcanvas = lazy(() => import("../feature-module/uiinterface/offcanvas"));
const Pagination = lazy(() => import("../feature-module/uiinterface/pagination"));

const Alert = lazy(() => import("../feature-module/uiinterface/alert"));
const Accordion = lazy(() => import("../feature-module/uiinterface/accordion"));
const Avatar = lazy(() => import("../feature-module/uiinterface/avatar"));
const Badges = lazy(() => import("../feature-module/uiinterface/badges"));
const Borders = lazy(() => import("../feature-module/uiinterface/borders"));
const Buttons = lazy(() => import("../feature-module/uiinterface/buttons"));
const ButtonsGroup = lazy(() => import("../feature-module/uiinterface/buttonsgroup"));
const Popovers = lazy(() => import("../feature-module/uiinterface/popover"));

const Breadcrumb = lazy(() => import("../feature-module/uiinterface/breadcrumb"));
const Cards = lazy(() => import("../feature-module/uiinterface/cards"));
const Dropdowns = lazy(() => import("../feature-module/uiinterface/dropdowns"));
const Colors = lazy(() => import("../feature-module/uiinterface/colors"));
const Carousel = lazy(() => import("../feature-module/uiinterface/carousel"));
const Spinner = lazy(() => import("../feature-module/uiinterface/spinner"));
const NavTabs = lazy(() => import("../feature-module/uiinterface/navtabs"));
const Toasts = lazy(() => import("../feature-module/uiinterface/toasts"));
const Typography = lazy(() => import("../feature-module/uiinterface/typography"));
const Video = lazy(() => import("../feature-module/uiinterface/video"));
const Tooltips = lazy(() => import("../feature-module/uiinterface/tooltips"));
const DragDrop = lazy(() => import("../feature-module/uiinterface/advancedui/dragdrop"));
const SweetAlert = lazy(() => import("../feature-module/uiinterface/sweetalert"));
const Progress = lazy(() => import("../feature-module/uiinterface/progress"));
const Placeholder = lazy(() => import("../feature-module/uiinterface/placeholder"));
const Rating = lazy(() => import("../feature-module/uiinterface/advancedui/rating"));
const TextEditor = lazy(() => import("../feature-module/uiinterface/advancedui/texteditor"));
const Counter = lazy(() => import("../feature-module/uiinterface/advancedui/counter"));
const Uiscrollbar = lazy(() => import("../feature-module/uiinterface/advancedui/uiscrollbar"));
const Stickynote = lazy(() => import("../feature-module/uiinterface/advancedui/stickynote"));
const Timeline = lazy(() => import("../feature-module/uiinterface/advancedui/timeline"));
const Apexchart = lazy(() => import("../feature-module/uiinterface/charts/apexcharts"));
const ChartJs = lazy(() => import("../feature-module/uiinterface/charts/chartjs"));
const RangeSlides = lazy(() => import("../feature-module/uiinterface/rangeslider"));
const FontawesomeIcons = lazy(() => import("../feature-module/uiinterface/icons/fontawesome"));
const FeatherIcons = lazy(() => import("../feature-module/uiinterface/icons/feathericon"));
const IonicIcons = lazy(() => import("../feature-module/uiinterface/icons/ionicicons"));
const MaterialIcons = lazy(() => import("../feature-module/uiinterface/icons/materialicon"));
const PE7Icons = lazy(() => import("../feature-module/uiinterface/icons/pe7icons"));
const SimplelineIcons = lazy(() => import("../feature-module/uiinterface/icons/simplelineicon"));
const ThemifyIcons = lazy(() => import("../feature-module/uiinterface/icons/themify"));
const WeatherIcons = lazy(() => import("../feature-module/uiinterface/icons/weathericons"));
const TypiconIcons = lazy(() => import("../feature-module/uiinterface/icons/typicons"));
const FlagIcons = lazy(() => import("../feature-module/uiinterface/icons/flagicons"));

const routes = all_routes;

const DepartmentGrid = lazy(() => import("../feature-module/hrm/departmentgrid"));
const DepartmentList = lazy(() => import("../feature-module/hrm/departmentlist"));
const Designation = lazy(() => import("../feature-module/hrm/designation"));
const Shift = lazy(() => import("../feature-module/hrm/shift"));
const AttendanceEmployee = lazy(() => import("../feature-module/hrm/attendance-employee"));
const ClipBoard = lazy(() => import("../feature-module/uiinterface/advancedui/clipboard"));
const TablesBasic = lazy(() => import("../feature-module/uiinterface/table/tables-basic"));
const DataTables = lazy(() => import("../feature-module/uiinterface/table/data-tables"));
const JobEntry = lazy(() => import("../feature-module/uiinterface/table/JobEntry"));

const Designn = lazy(() => import("../feature-module/uiinterface/table/Designn"));
const Layout = lazy(() => import("../feature-module/uiinterface/table/Layout"));
const Delivery = lazy(() => import("../feature-module/uiinterface/table/Delivery"));
const Implementation = lazy(() => import("../feature-module/uiinterface/table/Implementation"));
const MyPriority = lazy(() => import("../feature-module/pages/myPriority/MyPriority"));
const ImplementationDownload = lazy(() => import("../feature-module/uiinterface/table/ImplementationUpload"));
const PendingJobsWithHold = lazy(() => import("../feature-module/uiinterface/table/PendingJobsWithHold"));


const MisReport = lazy(() => import("../feature-module/uiinterface/report/MisReport"));
const WeeklyAuditReport = lazy(() => import("../feature-module/uiinterface/report/WeeklyAuditReport"));
const ConsolidatedReport = lazy(() => import("../feature-module/uiinterface/report/ConsolidatedReport"));
const BillingExport = lazy(() => import("../feature-module/uiinterface/report/PrintingReport"));
const JobTracker = lazy(() => import("../feature-module/uiinterface/summary/JobTrack"));
const Approval = lazy(() => import("../.././src/approvalPage/Approval"));
const StoreData = lazy(() => import("../kanbanview"));

const FormBasicInputs = lazy(() => import("../feature-module/uiinterface/forms/formelements/basic-inputs"));
const CheckboxRadios = lazy(() => import("../feature-module/uiinterface/forms/formelements/checkbox-radios"));
const InputGroup = lazy(() => import("../feature-module/uiinterface/forms/formelements/input-group"));
const GridGutters = lazy(() => import("../feature-module/uiinterface/forms/formelements/grid-gutters"));
const FormSelect = lazy(() => import("../feature-module/uiinterface/forms/formelements/form-select"));
const FileUpload = lazy(() => import("../feature-module/uiinterface/forms/formelements/fileupload"));
const FormMask = lazy(() => import("../feature-module/uiinterface/forms/formelements/form-mask"));
const FormHorizontal = lazy(() => import("../feature-module/uiinterface/forms/formelements/layouts/form-horizontal"));
const FormVertical = lazy(() => import("../feature-module/uiinterface/forms/formelements/layouts/form-vertical"));
const FloatingLabel = lazy(() => import("../feature-module/uiinterface/forms/formelements/layouts/floating-label"));
const FormValidation = lazy(() => import("../feature-module/uiinterface/forms/formelements/layouts/form-validation"));
const FormSelect2 = lazy(() => import("../feature-module/uiinterface/forms/formelements/layouts/form-select2"));
const Ribbon = lazy(() => import("../feature-module/uiinterface/advancedui/ribbon"));
const Chats = lazy(() => import("../feature-module/Application/chat"));
const ExpensesList = lazy(() => import("../feature-module/FinanceAccounts/expenseslist"));
const ExpenseCategory = lazy(() => import("../feature-module/FinanceAccounts/expensecategory"));
const ExpenseReimbursement = lazy(() => import("../feature-module/FinanceAccounts/expensereimbursement"));
const Calendar = lazy(() => import("../feature-module/Application/calendar"));
const FormWizard = lazy(() => import("../feature-module/uiinterface/forms/formelements/form-wizard"));
const ExpiredProduct = lazy(() => import("../feature-module/inventory/expiredproduct"));
const LowStock = lazy(() => import("../feature-module/inventory/lowstock"));
const CategoryList = lazy(() => import("../feature-module/inventory/categorylist"));
const SubCategories = lazy(() => import("../feature-module/inventory/subcategories"));
const EditProduct = lazy(() => import("../feature-module/inventory/editproduct"));
const Videocall = lazy(() => import("../feature-module/Application/videocall"));
const Audiocall = lazy(() => import("../feature-module/Application/audiocall"));
const Email = lazy(() => import("../feature-module/Application/email"));
const Callhistory = lazy(() => import("../feature-module/Application/callhistory"));
const ToDo = lazy(() => import("../feature-module/Application/todo"));
const QRcode = lazy(() => import("../feature-module/inventory/qrcode"));
const PurchasesList = lazy(() => import("../feature-module/purchases/purchaseslist"));
const PurchaseOrderReport = lazy(() => import("../feature-module/purchases/purchaseorderreport"));
const MaterialProcurement = lazy(() => import("../feature-module/purchases/materialprocurement"));
const PurchaseReturns = lazy(() => import("../feature-module/purchases/purchasereturns"));
const Appearance = lazy(() => import("../feature-module/settings/websitesettings/appearance"));
const SocialAuthentication = lazy(() => import("../feature-module/settings/websitesettings/socialauthentication"));
const LanguageSettings = lazy(() => import("../feature-module/settings/websitesettings/languagesettings"));
const InvoiceSettings = lazy(() => import("../feature-module/settings/appsetting/invoicesettings"));
const PrinterSettings = lazy(() => import("../feature-module/settings/appsetting/printersettings"));
const PosSettings = lazy(() => import("../feature-module/settings/websitesettings/possettings"));
const CustomFields = lazy(() => import("../feature-module/settings/websitesettings/customfields"));
const EmailSettings = lazy(() => import("../feature-module/settings/systemsettings/emailsettings"));
const SmsGateway = lazy(() => import("../feature-module/settings/systemsettings/smsgateway"));
const OtpSettings = lazy(() => import("../feature-module/settings/systemsettings/otpsettings"));
const GdprSettings = lazy(() => import("../feature-module/settings/systemsettings/gdprsettings"));
const PaymentGateway = lazy(() => import("../feature-module/settings/financialsettings/paymentgateway"));
const BankSetting = lazy(() => import("../feature-module/settings/financialsettings/banksetting"));
const Customers = lazy(() => import("../feature-module/people/customers"));
const Suppliers = lazy(() => import("../feature-module/people/suppliers"));
const StoreList = lazy(() => import("../core/modals/peoples/storelist"));
const Managestock = lazy(() => import("../feature-module/stock/managestock"));
const StockAdjustment = lazy(() => import("../feature-module/stock/stockAdjustment"));
const StockTransfer = lazy(() => import("../feature-module/stock/stockTransfer"));
const SalesReport = lazy(() => import("../feature-module/Reports/salesreport"));
const PurchaseReport = lazy(() => import("../feature-module/Reports/purchasereport"));
const InventoryReport = lazy(() => import("../feature-module/Reports/inventoryreport"));
const Invoicereport = lazy(() => import("../feature-module/Reports/invoicereport"));
const SupplierReport = lazy(() => import("../feature-module/Reports/supplierreport"));
const CustomerReport = lazy(() => import("../feature-module/Reports/customerreport"));
const ExpenseReport = lazy(() => import("../feature-module/Reports/expensereport"));
const IncomeReport = lazy(() => import("../feature-module/Reports/incomereport"));
const TaxReport = lazy(() => import("../feature-module/Reports/taxreport"));
const ProfitLoss = lazy(() => import("../feature-module/Reports/profitloss"));
const GeneralSettings = lazy(() => import("../feature-module/settings/generalsettings/generalsettings"));
const SecuritySettings = lazy(() => import("../feature-module/settings/generalsettings/securitysettings"));
const Notification = lazy(() => import("../feature-module/settings/generalsettings/notification"));
const ConnectedApps = lazy(() => import("../feature-module/settings/generalsettings/connectedapps"));
const SystemSettings = lazy(() => import("../feature-module/settings/websitesettings/systemsettings"));
const CompanySettings = lazy(() => import("../feature-module/settings/websitesettings/companysettings"));
const LocalizationSettings = lazy(() => import("../feature-module/settings/websitesettings/localizationsettings"));
const Prefixes = lazy(() => import("../feature-module/settings/websitesettings/prefixes"));
const Preference = lazy(() => import("../feature-module/settings/websitesettings/preference"));
const BanIpaddress = lazy(() => import("../feature-module/settings/othersettings/ban-ipaddress"));
const StorageSettings = lazy(() => import("../feature-module/settings/othersettings/storagesettings"));
const Pos = lazy(() => import("../feature-module/sales/pos"));
const AttendanceAdmin = lazy(() => import("../feature-module/hrm/attendanceadmin"));
const Payslip = lazy(() => import("../feature-module/hrm/payslip"));
const Holidays = lazy(() => import("../feature-module/hrm/holidays"));
const SalesList = lazy(() => import("../feature-module/sales/saleslist"));
const InvoiceReport = lazy(() => import("../feature-module/sales/invoicereport"));
const SalesReturn = lazy(() => import("../feature-module/sales/salesreturn"));
const QuotationList = lazy(() => import("../feature-module/sales/quotationlist"));
const Notes = lazy(() => import("../feature-module/Application/notes"));
const FileManager = lazy(() => import("../feature-module/Application/filemanager"));
const Profile = lazy(() => import("../feature-module/pages/profile"));
const Signin = lazy(() => import("../feature-module/pages/login/signin"));
const SigninTwo = lazy(() => import("../feature-module/pages/login/signinTwo"));
const SigninThree = lazy(() => import("../feature-module/pages/login/signinThree"));
const RegisterTwo = lazy(() => import("../feature-module/pages/register/registerTwo"));
const Register = lazy(() => import("../feature-module/pages/register/register"));
const RegisterThree = lazy(() => import("../feature-module/pages/register/registerThree"));
const Forgotpassword = lazy(() => import("../feature-module/pages/forgotpassword/forgotpassword"));
const ForgotpasswordTwo = lazy(() => import("../feature-module/pages/forgotpassword/forgotpasswordTwo"));
const ForgotpasswordThree = lazy(() => import("../feature-module/pages/forgotpassword/forgotpasswordThree"));
const Resetpassword = lazy(() => import("../feature-module/pages/resetpassword/resetpassword"));
const ResetpasswordTwo = lazy(() => import("../feature-module/pages/resetpassword/resetpasswordTwo"));
const ResetpasswordThree = lazy(() => import("../feature-module/pages/resetpassword/resetpasswordThree"));
const EmailVerification = lazy(() => import("../feature-module/pages/emailverification/emailverification"));
const EmailverificationTwo = lazy(() => import("../feature-module/pages/emailverification/emailverificationTwo"));
const EmailverificationThree = lazy(() => import("../feature-module/pages/emailverification/emailverificationThree"));
const Twostepverification = lazy(() => import("../feature-module/pages/twostepverification/twostepverification"));
const TwostepverificationTwo = lazy(() => import("../feature-module/pages/twostepverification/twostepverificationTwo"));
const TwostepverificationThree = lazy(() => import("../feature-module/pages/twostepverification/twostepverificationThree"));
const Lockscreen = lazy(() => import("../feature-module/pages/lockscreen"));
const Error404 = lazy(() => import("../feature-module/pages/errorpages/error404"));
const Error500 = lazy(() => import("../feature-module/pages/errorpages/error500"));
const Blankpage = lazy(() => import("../feature-module/pages/blankpage"));
const Comingsoon = lazy(() => import("../feature-module/pages/comingsoon"));
const Undermaintainence = lazy(() => import("../feature-module/pages/undermaintainence"));
const Users = lazy(() => import("../feature-module/usermanagement/users"));
const RolesPermissions = lazy(() => import("../feature-module/usermanagement/rolespermissions"));
const Permissions = lazy(() => import("../feature-module/usermanagement/permissions"));
const DeleteAccount = lazy(() => import("../feature-module/usermanagement/deleteaccount"));
const EmployeesGrid = lazy(() => import("../feature-module/hrm/employeesgrid"));
const EditEmployee = lazy(() => import("../feature-module/hrm/editemployee"));
const AddEmployee = lazy(() => import("../feature-module/hrm/addemployee"));
const LeavesAdmin = lazy(() => import("../feature-module/hrm/leavesadmin"));
const LeavesEmployee = lazy(() => import("../feature-module/hrm/leavesemployee"));
const LeaveTypes = lazy(() => import("../feature-module/hrm/leavetypes"));
const ProductDetail = lazy(() => import("../feature-module/inventory/productdetail"));
const Units = lazy(() => import("../feature-module/inventory/units").then(({ Units }) => ({ default: Units })));
const TaxRates = lazy(() => import("../feature-module/settings/financialsettings/taxrates"));
const CurrencySettings = lazy(() => import("../feature-module/settings/financialsettings/currencysettings"));
const WareHouses = lazy(() => import("../core/modals/peoples/warehouses"));
const Coupons = lazy(() => import("../feature-module/coupons/coupons"));
import { all_routes } from "./all_routes";
const BankSettingGrid = lazy(() => import("../feature-module/settings/financialsettings/banksettinggrid"));
const PayrollList = lazy(() => import("../feature-module/hrm/payroll-list"));
const Printlaminpacking = lazy(() => import("../feature-module/uiinterface/table/Printlaminpacking"));


const DeliveryChallanPreview = lazy(() => import("../feature-module/uiinterface/table/DeliveryChallanPreview"));
const ImplementationChallanPreview = lazy(() => import("../feature-module/uiinterface/table/ImplementationChallanPreview"));
const ChallanDashboard = lazy(() => import("../feature-module/uiinterface/table/challan_dashboard"));
const InvoicePreviewBuilder = lazy(() => import("../feature-module/uiinterface/table/InvoicePreviewBuilder"));
const InvoiceList = lazy(() => import("../feature-module/uiinterface/table/InvoiceList"));
const InvoicePrintPreview = lazy(() => import("../feature-module/uiinterface/table/InvoicePrintPreview"));
const ProductMediaRateMaster = lazy(() => import("../feature-module/uiinterface/table/ProductMediaRateMaster"));
const ElementGroupMaster = lazy(() => import("../feature-module/uiinterface/table/ElementGroupMaster"));
const Production = lazy(() => import("../feature-module/uiinterface/table/Production"));
const StoreMaster = lazy(() => import("../feature-module/uiinterface/table/store/StoreMaster"));
const Recce = lazy(() => import("../feature-module/uiinterface/table/Recce"));
const RetailCustomer = lazy(() => import("../feature-module/uiinterface/table/RetailCustomer"));
export const publicRoutes = [
  {
    id: 1,
    path: routes.dashboard,
    name: "home",
    element: <Dashboard />,
    route: Route,
  },
  
  {
    id: 2,
    path: routes.productlist,
    name: "products",
    element: <ProductList />,
    route: Route,
  },
  
  {
    id: 3,
    path: routes.addproduct,
    name: "products",
    element: <AddProduct />,
    route: Route,
  },
  {
    id: 4,
    path: routes.salesdashboard,
    name: "salesdashboard",
    element: <SalesDashbaord />,
    route: Route,
  },
  {
    id: 5,
    path: routes.timesheetdashboard,
    name: "timesheetdashboard",
    element: <TimesheetDashboard />,
    route: Route,
  },
  {
    id: 5.1,
    path: routes.whatsappdashboard,
    name: "whatsappdashboard",
    element: <WhatsappDashboard />,
    route: Route,
  },
  {
    id: 5.2,
    path: routes.designerdashboard,
    name: "designerdashboard",
    element: <DesignerDashboard />,
    route: Route,
  },
  {
    id: 6,
    path: routes.brandlist,
    name: "brant",
    element: <BrandList />,
    route: Route,
  },
  {
    id: 6,
    path: routes.units,
    name: "unit",
    element: <Units />,
    route: Route,
  },
  {
    id: 7,
    path: routes.variantyattributes,
    name: "variantyattributes",
    element: <VariantAttributes />,
    route: Route,
  },
  {
    id: 8,
    path: routes.warranty,
    name: "warranty",
    element: <Warranty />,
    route: Route,
  },
  {
    id: 9,
    path: routes.barcode,
    name: "barcode",
    element: <PrintBarcode />,
    route: Route,
  },
 
  {
    id: 10,
    path: routes.alerts,
    name: "alert",
    element: <Alert />,
    route: Route,
  },
  {
    id: 11,
    path: routes.grid,
    name: "grid",
    element: <Grid />,
    route: Route,
  },

  {
    id: 12,
    path: routes.accordion,
    name: "accordion",
    element: <Accordion />,
    route: Route,
  },
  {
    id: 13,
    path: routes.avatar,
    name: "avatar",
    element: <Avatar />,
    route: Route,
  },
  {
    id: 14,
    path: routes.images,
    name: "images",
    element: <Images />,
    route: Route,
  },

  {
    id: 15,
    path: routes.badges,
    name: "badges",
    element: <Badges />,
    route: Route,
  },
  {
    id: 16,
    path: routes.lightbox,
    name: "lightbox",
    element: <Lightboxes />,
    route: Route,
  },

  {
    id: 17,
    path: routes.borders,
    name: "borders",
    element: <Borders />,
    route: Route,
  },
  {
    id: 18,
    path: routes.media,
    name: "lightbox",
    element: <Media />,
    route: Route,
  },
  {
    id: 19,
    path: routes.buttons,
    name: "borders",
    element: <Buttons />,
    route: Route,
  },
  {
    id: 20,
    path: routes.modals,
    name: "modals",
    element: <Modals />,
    route: Route,
  },
  {
    id: 21,
    path: routes.offcanvas,
    name: "offcanvas",
    element: <Offcanvas />,
    route: Route,
  },
  {
    id: 22,
    path: routes.pagination,
    name: "offcanvas",
    element: <Pagination />,
    route: Route,
  },
  {
    id: 23,
    path: routes.buttonsgroup,
    name: "buttonsgroup",
    element: <ButtonsGroup />,
    route: Route,
  },
  {
    id: 24,
    path: routes.popover,
    name: "buttonsgroup",
    element: <Popovers />,
    route: Route,
  },
  {
    id: 25,
    path: routes.breadcrumb,
    name: "breadcrumb",
    element: <Breadcrumb />,
    route: Route,
  },
  {
    id: 26,
    path: routes.cards,
    name: "cards",
    element: <Cards />,
    route: Route,
  },
  {
    id: 27,
    path: routes.dropdowns,
    name: "dropdowns",
    element: <Dropdowns />,
    route: Route,
  },
  {
    id: 27,
    path: routes.colors,
    name: "colors",
    element: <Colors />,
    route: Route,
  },
  {
    id: 28,
    path: routes.carousel,
    name: "carousel",
    element: <Carousel />,
    route: Route,
  },
  {
    id: 29,
    path: routes.spinner,
    name: "spinner",
    element: <Spinner />,
    route: Route,
  },
  {
    id: 30,
    path: routes.carousel,
    name: "carousel",
    element: <Carousel />,
    route: Route,
  },
  {
    id: 31,
    path: routes.navtabs,
    name: "navtabs",
    element: <NavTabs />,
    route: Route,
  },
  {
    id: 32,
    path: routes.toasts,
    name: "toasts",
    element: <Toasts />,
    route: Route,
  },
  {
    id: 33,
    path: routes.typography,
    name: "typography",
    element: <Typography />,
    route: Route,
  },
  {
    id: 34,
    path: routes.video,
    name: "video",
    element: <Video />,
    route: Route,
  },
  {
    id: 35,
    path: routes.tooltip,
    name: "tooltip",
    element: <Tooltips />,
    route: Route,
  },
  {
    id: 36,
    path: routes.draganddrop,
    name: "draganddrop",
    element: <DragDrop />,
    route: Route,
  },
  {
    id: 37,
    path: routes.sweetalerts,
    name: "sweetalerts",
    element: <SweetAlert />,
    route: Route,
  },
  {
    id: 38,
    path: routes.progress,
    name: "progress",
    element: <Progress />,
    route: Route,
  },
  {
    id: 38,
    path: routes.departmentgrid,
    name: "departmentgrid",
    element: <DepartmentGrid />,
    route: Route,
  },
  {
    id: 39,
    path: routes.placeholder,
    name: "placeholder",
    element: <Placeholder />,
    route: Route,
  },

  {
    id: 39,
    path: routes.departmentlist,
    name: "departmentlist",
    element: <DepartmentList />,
    route: Route,
  },
  {
    id: 40,
    path: routes.rating,
    name: "rating",
    element: <Rating />,
  },

  {
    id: 40,
    path: routes.designation,
    name: "designation",
    element: <Designation />,
    route: Route,
  },
  {
    id: 41,
    path: routes.texteditor,
    name: "text-editor",
    element: <TextEditor />,
    route: Route,
  },

  {
    id: 41,

    path: routes.shift,
    name: "shift",
    element: <Shift />,
    route: Route,
  },
  {
    id: 42,
    path: routes.counter,
    name: "counter",
    element: <Counter />,
    route: Route,
  },
  {
    id: 42,
    path: routes.attendanceemployee,
    name: "attendanceemployee",
    element: <AttendanceEmployee />,
    route: Route,
  },
  {
    id: 43,
    path: routes.scrollbar,
    name: "scrollbar",
    element: <Uiscrollbar />,
    route: Route,
  },
  {
    id: 43,
    path: routes.clipboard,
    name: "clipboard",
    element: <ClipBoard />,
    route: Route,
  },
  {
    id: 44,
    path: routes.stickynote,
    name: "stickynote",
    element: <Stickynote />,
    route: Route,
  },
  {
    id: 44,
    path: routes.tablebasic,
    name: "tablebasic",
    element: <TablesBasic />,
    route: Route,
  },
  {
    id: 45,
    path: routes.timeline,
    name: "timeline",
    element: <Timeline />,
    route: Route,
  },
  {
    id: 45,
    path: routes.datatable,
    name: "datatable",
    element: <DataTables />,
    route: Route,
  },
  {
    id: 48,
    path: routes.designn,
    name: "designn",
    element: <Designn />,
    route: Route,
  },
  {
    id: 49,
    path: routes.production,
    name: "production",
    element: <Production />,
    route: Route,
  },
  {
    id: 50,
    path: routes.delivery,
    name: "delivery",
    element: <Delivery />,
    route: Route,
  },
  {
    id: 61,
    path: routes.implementation,
    name: "implementation",
    element: <Implementation />,
    route: Route,
  },
  {
    id: 62,
    path: routes.implementationDownload,
    name: "implementationUpload",
    element: <ImplementationDownload />,
    route: Route,
  },
  {
    id: 63,
    path: routes.myPriority,
    name: "myPriority",
    element: <MyPriority />,
    route: Route,
  },
  {
    id: 49,
    path: routes.misreport,
    name: "misreport",
    element: <MisReport />,
    route: Route,
  },
  {
    id: 491,
    path: routes.weeklyAuditReport,
    name: "weeklyAuditReport",
    element: <WeeklyAuditReport />,
    route: Route,
  },
    {
    id: 50,
    path: routes.ConsolidatedReport,
    name: "ConsolidatedReport",
    element: <ConsolidatedReport />,
    route: Route,
  },
  {
    id: 53,
    path: routes.billingexport,
    name: "billingexport",
    element: <BillingExport />,
    route: Route,
  },
  {
    id: 51,
    path: routes.jobtracker,
    name: "jobtracker",
    element: <JobTracker />,
    route: Route,
  },
  

  {
    id: 52,
    path: routes.storedata,
    name: "storedata",
    element: <StoreData />,
    route: Route,
  },
  {
    id: 52,
    path: routes.approval,
    name: "approval",
    element: <Approval />,
    route: Route,
  },
  {
    id:53,
    path:routes.printlaminpacking,
    name:"printlaminpacking",
    element:<Printlaminpacking/>,
    route:Route,
  },
  {
    id: 46,
    path: routes.apexchart,
    name: "apex-chart",
    element: <Apexchart />,
    route: Route,
  },

  {
    id: 46,
    path: routes.basicinput,
    name: "formbasicinput",
    element: <FormBasicInputs />,
    route: Route,
  },
  {
    id: 47,
    path: routes.chartjs,
    name: "chart-js",
    element: <ChartJs />,
    route: Route,
  },
  {
    id: 47,
    path: routes.checkboxradio,
    name: "checkboxradio",
    element: <CheckboxRadios />,
    route: Route,
  },
  {
    id: 48,
    path: routes.rangeslider,
    name: "range-slider",
    element: <RangeSlides />,
    route: Route,
  },
  {
    id: 49,
    path: routes.fontawesome,
    name: "fontawesome",
    element: <FontawesomeIcons />,
    route: Route,
  },
  {
    id: 50,
    path: routes.feathericon,
    name: "feathericon",
    element: <FeatherIcons />,
    route: Route,
  },
  {
    id: 51,
    path: routes.ionicicons,
    name: "ionicicons",
    element: <IonicIcons />,
    route: Route,
  },
  {
    id: 52,
    path: routes.materialicons,
    name: "materialicons",
    element: <MaterialIcons />,
    route: Route,
  },
  {
    id: 53,
    path: routes.pe7icons,
    name: "pe7icons",
    element: <PE7Icons />,
    route: Route,
  },
  {
    id: 54,
    path: routes.simpleline,
    name: "simpleline",
    element: <SimplelineIcons />,
    route: Route,
  },
  {
    id: 55,
    path: routes.themifyicons,
    name: "themifyicon",
    element: <ThemifyIcons />,
    route: Route,
  },
  {
    id: 56,
    path: routes.iconweather,
    name: "iconweather",
    element: <WeatherIcons />,
    route: Route,
  },
  {
    id: 57,
    path: routes.typicons,
    name: "typicons",
    element: <TypiconIcons />,
    route: Route,
  },
  {
    id: 58,
    path: routes.flagicons,
    name: "flagicons",
    element: <FlagIcons />,
    route: Route,
  },
  {
    id: 58,
    path: routes.inputgroup,
    name: "inputgroup",
    element: <InputGroup />,
    route: Route,
  },
  {
    id: 59,
    path: routes.ribbon,
    name: "ribbon",
    element: <Ribbon />,
    route: Route,
  },
  {
    id: 60,
    path: routes.chat,
    name: "chat",
    element: <Chats />,
    route: Route,
  },
  {
    id: 49,
    path: routes.gridgutters,
    name: "gridgutters",
    element: <GridGutters />,
    route: Route,
  },
  {
    id: 50,
    path: routes.gridgutters,
    name: "gridgutters",
    element: <GridGutters />,
    route: Route,
  },
  {
    id: 51,
    path: routes.formselect,
    name: "formselect",
    element: <FormSelect />,
    route: Route,
  },
  {
    id: 52,
    path: routes.fileupload,
    name: "fileupload",
    element: <FileUpload />,
    route: Route,
  },
  {
    id: 53,
    path: routes.formmask,
    name: "formmask",
    element: <FormMask />,
    route: Route,
  },
  {
    id: 54,
    path: routes.formhorizontal,
    name: "formhorizontal",
    element: <FormHorizontal />,
    route: Route,
  },
  {
    id: 54,
    path: routes.formvertical,
    name: "formvertical",
    element: <FormVertical />,
    route: Route,
  },
  {
    id: 55,
    path: routes.floatinglabel,
    name: "floatinglabel",
    element: <FloatingLabel />,
    route: Route,
  },
  {
    id: 56,
    path: routes.formvalidation,
    name: "formvalidation",
    element: <FormValidation />,
    route: Route,
  },
  {
    id: 57,
    path: routes.select2,
    name: "select2",
    element: <FormSelect2 />,
    route: Route,
  },
  {
    id: 58,
    path: routes.wizard,
    name: "wizard",
    element: <FormWizard />,
    route: Route,
  },
  {
    id: 58,
    path: routes.expiredproduct,
    name: "expiredproduct",
    element: <ExpiredProduct />,
    route: Route,
  },
  {
    id: 59,
    path: routes.lowstock,
    name: "lowstock",
    element: <LowStock />,
    route: Route,
  },
  {
    id: 60,
    path: routes.categorylist,
    name: "categorylist",
    element: <CategoryList />,
    route: Route,
  },
  {
    id: 61,
    path: routes.expenselist,
    name: "expenselist",
    element: <ExpensesList />,
    route: Route,
  },
  {
    id: 62,
    path: routes.expensecategory,
    name: "expensecategory",
    element: <ExpenseCategory />,
    route: Route,
  },
  {
    id: 621,
    path: routes.expenseReimbursement,
    name: "expenseReimbursement",
    element: <ExpenseReimbursement />,
    route: Route,
  },
  {
    id: 63,
    path: routes.calendar,
    name: "calendar",
    element: <Calendar />,
    route: Route,
  },

  {
    id: 64,
    path: routes.subcategories,
    name: "subcategories",
    element: <SubCategories />,
    route: Route,
  },
  {
    id: 65,
    path: routes.editproduct,
    name: "editproduct",
    element: <EditProduct />,
    route: Route,
  },
  {
    id: 63,
    path: routes.videocall,
    name: "videocall",
    element: <Videocall />,
    route: Route,
  },
  {
    id: 64,
    path: routes.audiocall,
    name: "audiocall",
    element: <Audiocall />,
    route: Route,
  },
  {
    id: 65,
    path: routes.email,
    name: "email",
    element: <Email />,
    route: Route,
  },
  {
    id: 66,
    path: routes.callhistory,
    name: "callhistory",
    element: <Callhistory />,
    route: Route,
  },
  {
    id: 67,
    path: routes.todo,
    name: "todo",
    element: <ToDo />,
    route: Route,
  },
  {
    id: 66,
    path: routes.variantattributes,
    name: "variantattributes",
    element: <VariantAttributes />,
    route: Route,
  },
  {
    id: 67,
    path: routes.qrcode,
    name: "qrcode",
    element: <QRcode />,
    route: Route,
  },
  {
    id: 68,
    path: routes.purchaselist,
    name: "purchaselist",
    element: <PurchasesList />,
    route: Route,
  },
  {
    id: 69,
    path: routes.purchaseorderreport,
    name: "purchaseorderreport",
    element: <PurchaseOrderReport />,
    route: Route,
  },
  {
    id: 70,
    path: routes.purchasereturn,
    name: "purchasereturn",
    element: <PurchaseReturns />,
    route: Route,
  },
  {
    id: 701,
    path: routes.materialProcurement,
    name: "materialProcurement",
    element: <MaterialProcurement />,
    route: Route,
  },
  {
    id: 71,
    path: routes.appearance,
    name: "appearance",
    element: <Appearance />,
    route: Route,
  },
  {
    id: 72,
    path: routes.socialauthendication,
    name: "socialauthendication",
    element: <SocialAuthentication />,
    route: Route,
  },
  {
    id: 73,
    path: routes.languagesettings,
    name: "languagesettings",
    element: <LanguageSettings />,
    route: Route,
  },
  {
    id: 74,
    path: routes.invoicesettings,
    name: "invoicesettings",
    element: <InvoiceSettings />,
    route: Route,
  },
  {
    id: 75,
    path: routes.printersettings,
    name: "printersettings",
    element: <PrinterSettings />,
    route: Route,
  },
  {
    id: 76,
    path: routes.possettings,
    name: "possettings",
    element: <PosSettings />,
    route: Route,
  },
  {
    id: 77,
    path: routes.customfields,
    name: "customfields",
    element: <CustomFields />,
    route: Route,
  },
  {
    id: 78,
    path: routes.emailsettings,
    name: "emailsettings",
    element: <EmailSettings />,
    route: Route,
  },
  {
    id: 79,
    path: routes.smssettings,
    name: "smssettings",
    element: <SmsGateway />,
    route: Route,
  },
  {
    id: 80,
    path: routes.otpsettings,
    name: "otpsettings",
    element: <OtpSettings />,
    route: Route,
  },
  {
    id: 81,
    path: routes.gdbrsettings,
    name: "gdbrsettings",
    element: <GdprSettings />,
    route: Route,
  },
  {
    id: 82,
    path: routes.paymentgateway,
    name: "paymentgateway",
    element: <PaymentGateway />,
    route: Route,
  },
  {
    id: 83,
    path: routes.banksettingslist,
    name: "banksettingslist",
    element: <BankSetting />,
    route: Route,
  },
  {
    id: 84,
    path: routes.customers,
    name: "customers",
    element: <Customers />,
    route: Route,
  },
  {
    id: 85,
    path: routes.suppliers,
    name: "suppliers",
    element: <Suppliers />,
    route: Route,
  },
  {
    id: 86,
    path: routes.storelist,
    name: "storelist",
    element: <StoreList />,
    route: Route,
  },
  {
    id: 87,
    path: routes.managestock,
    name: "managestock",
    element: <Managestock />,
    route: Route,
  },
  {
    id: 88,
    path: routes.stockadjustment,
    name: "stockadjustment",
    element: <StockAdjustment />,
    route: Route,
  },
  {
    id: 89,
    path: routes.stocktransfer,
    name: "stocktransfer",
    element: <StockTransfer />,
    route: Route,
  },
  {
    id: 90,
    path: routes.salesreport,
    name: "salesreport",
    element: <SalesReport />,
    route: Route,
  },
  {
    id: 91,
    path: routes.purchasereport,
    name: "purchasereport",
    element: <PurchaseReport />,
    route: Route,
  },
  {
    id: 92,
    path: routes.inventoryreport,
    name: "inventoryreport",
    element: <InventoryReport />,
    route: Route,
  },
  {
    id: 93,
    path: routes.invoicereport,
    name: "invoicereport",
    element: <Invoicereport />,
    route: Route,
  },
  {
    id: 94,
    path: routes.supplierreport,
    name: "supplierreport",
    element: <SupplierReport />,
    route: Route,
  },
  {
    id: 95,
    path: routes.customerreport,
    name: "customerreport",
    element: <CustomerReport />,
    route: Route,
  },
  {
    id: 96,
    path: routes.expensereport,
    name: "expensereport",
    element: <ExpenseReport />,
    route: Route,
  },
  {
    id: 97,
    path: routes.incomereport,
    name: "incomereport",
    element: <IncomeReport />,
    route: Route,
  },
  {
    id: 98,
    path: routes.taxreport,
    name: "taxreport",
    element: <TaxReport />,
    route: Route,
  },
  {
    id: 99,
    path: routes.profitloss,
    name: "profitloss",
    element: <ProfitLoss />,
    route: Route,
  },
  {
    id: 89,
    path: routes.generalsettings,
    name: "generalsettings",
    element: <GeneralSettings />,
    route: Route,
  },
  {
    id: 90,
    path: routes.securitysettings,
    name: "securitysettings",
    element: <SecuritySettings />,
    route: Route,
  },
  {
    id: 91,
    path: routes.notification,
    name: "notification",
    element: <Notification />,
    route: Route,
  },
  {
    id: 92,
    path: routes.connectedapps,
    name: "connectedapps",
    element: <ConnectedApps />,
    route: Route,
  },
  {
    id: 93,
    path: routes.systemsettings,
    name: "systemsettings",
    element: <SystemSettings />,
    route: Route,
  },
  {
    id: 94,
    path: routes.companysettings,
    name: "companysettings",
    element: <CompanySettings />,
    route: Route,
  },
  {
    id: 94,
    path: routes.localizationsettings,
    name: "localizationsettings",
    element: <LocalizationSettings />,
    route: Route,
  },
  {
    id: 95,
    path: routes.prefixes,
    name: "prefixes",
    element: <Prefixes />,
    route: Route,
  },
  {
    id: 99,
    path: routes.preference,
    name: "preference",
    element: <Preference />,
    route: Route,
  },
  {
    id: 99,
    path: routes.banipaddress,
    name: "banipaddress",
    element: <BanIpaddress />,
    route: Route,
  },
  {
    id: 99,
    path: routes.storagesettings,
    name: "storagesettings",
    element: <StorageSettings />,
    route: Route,
  },
  {
    id: 99,
    path: routes.taxrates,
    name: "taxrates",
    element: <TaxRates />,
    route: Route,
  },
  {
    id: 99,
    path: routes.currencysettings,
    name: "currencysettings",
    element: <CurrencySettings />,
    route: Route,
  },
  {
    id: 99,
    path: routes.pos,
    name: "pos",
    element: <Pos />,
    route: Route,
  },
  {
    id: 100,
    path: routes.attendanceadmin,
    name: "attendanceadmin",
    element: <AttendanceAdmin />,
    route: Route,
  },
  {
    id: 101,
    path: routes.payslip,
    name: "payslip",
    element: <Payslip />,
    route: Route,
  },
  {
    id: 102,
    path: routes.saleslist,
    name: "saleslist",
    element: <SalesList />,
    route: Route,
  },
  {
    id: 102,
    path: routes.invoicereport,
    name: "invoicereport",
    element: <InvoiceReport />,
    route: Route,
  },
  {
    id: 102,
    path: routes.holidays,
    name: "holidays",
    element: <Holidays />,
    route: Route,
  },
  {
    id: 102,
    path: routes.salesreturn,
    name: "salesreturn",
    element: <SalesReturn />,
    route: Route,
  },
  {
    id: 103,
    path: routes.quotationlist,
    name: "quotationlist",
    element: <QuotationList />,
    route: Route,
  },
  {
    id: 104,
    path: routes.notes,
    name: "notes",
    element: <Notes />,
    route: Route,
  },
  {
    id: 105,
    path: routes.filemanager,
    name: "filemanager",
    element: <FileManager />,
    route: Route,
  },
  {
    id: 106,
    path: routes.profile,
    name: "profile",
    element: <Profile />,
    route: Route,
  },
  {
    id: 20,
    path: routes.blankpage,
    name: "blankpage",
    element: <Blankpage />,
    route: Route,
  },
  {
    id: 104,
    path: routes.users,
    name: "users",
    element: <Users />,
    route: Route,
  },
  {
    id: 105,
    path: routes.rolespermission,
    name: "rolespermission",
    element: <RolesPermissions />,
    route: Route,
  },
  {
    id: 106,
    path: routes.permissions,
    name: "permissions",
    element: <Permissions />,
    route: Route,
  },
  {
    id: 107,
    path: routes.deleteaccount,
    name: "deleteaccount",
    element: <DeleteAccount />,
    route: Route,
  },
  {
    id: 108,
    path: routes.employeegrid,
    name: "employeegrid",
    element: <EmployeesGrid />,
    route: Route,
  },
  {
    id: 109,
    path: routes.addemployee,
    name: "addemployee",
    element: <AddEmployee />,
    route: Route,
  },
  {
    id: 110,
    path: routes.editemployee,
    name: "editemployee",
    element: <EditEmployee />,
    route: Route,
  },
  {
    id: 111,
    path: routes.leavesadmin,
    name: "leavesadmin",
    element: <LeavesAdmin />,
    route: Route,
  },
  {
    id: 112,
    path: routes.leavesemployee,
    name: "leavesemployee",
    element: <LeavesEmployee />,
    route: Route,
  },
  {
    id: 113,
    path: routes.leavestype,
    name: "leavestype",
    element: <LeaveTypes />,
    route: Route,
  },
  {
    id: 113,
    path: routes.productdetails,
    name: "productdetails",
    element: <ProductDetail />,
    route: Route,
  },
  {
    id: 114,
    path: routes.warehouses,
    name: "warehouses",
    element: <WareHouses />,
    route: Route,
  },
  {
    id: 115,
    path: routes.coupons,
    name: "coupons",
    element: <Coupons />,
    route: Route,
  },
  {
    id: 116,
    path: "*",
    name: "NotFound",
    element: <Navigate to="/" />,
    route: Route,
  },
  {
    id: 117,
    path: '/',
    name: 'Root',
    element: <Navigate to="/signin" />,
    route: Route,
  },
  {
    id: 118,
    path: routes.banksettingsgrid,
    name: "banksettingsgrid",
    element: <BankSettingGrid />,
    route: Route,
  },
  {
    id: 119,
    path: routes.payrollList,
    name: "payroll-list",
    element: <PayrollList />,
    route: Route,
  },
  {
    id: 120,
    path: routes.pendingJobsWithHold,
    name: "pending-jobs-with-hold",
    element: <PendingJobsWithHold />,
    route: Route,
  },
  {
    id: 121,
    path: routes.invoicepreviewbuilder,
    name: "invoicepreviewbuilder",
    element: <InvoicePreviewBuilder />,
    route: Route,
  },
  {
    id: 122,
    path: routes.invoiceList,
    name: "invoiceList",
    element: <InvoiceList />,
    route: Route,
  },
  {
    id: 123,
    path: routes.deliverychallan,
    name: "deliverychallan",
    element: <DeliveryChallanPreview />,
    route: Route,
  },
  {
    id: 124,
    path: routes.implementationchallan,
    name: "implementationchallan",
    element: <ImplementationChallanPreview />,
    route: Route,
  },
  {
    id: 125,
    path: routes.challandashboard,
    name: "challandashboard",
    element: <ChallanDashboard />,
    route: Route,
  },
  {
    id: 126,
    path: routes.invoiceprintpreview,
    name: "invoiceprintpreview",
    element: <InvoicePrintPreview />,
    route: Route,
  },
  {
    id: 127,
    path: routes.productMediaRateMaster,
    name: "productMediaRateMaster",
    element: <ProductMediaRateMaster />,
    route: Route,
  },
  {
    id: 128,
    path: routes.elementGroupMaster,
    name: "elementGroupMaster",
    element: <ElementGroupMaster />,
    route: Route,
  },
  {
    id: 129,
    path: routes.jobs,
    name: "jobs",
    element: <JobEntry />,
    route: Route,
  },
  {
    id: 130,
    path: routes.storeMaster,
    name: "storeMaster",
    element: <StoreMaster />,
    route: Route,
  },
  {
    id: 131,
    path: routes.recce,
    name: "recce",
    element: <Recce />,
    route: Route,
  },
  {
    id: 132,
    path: routes.retailCustomer,
    name: "retailCustomer",
    element: <RetailCustomer />,
    route: Route,
  },
  
];
export const posRoutes = [
  {
    id: 1,
    path: routes.pos,
    name: "pos",
    element: <Pos />,
    route: Route,
  },
];

export const ApprovalRoute = [
  {
    id: 1,
    path: routes.approval,
    name: "approval",
    element: <Approval />,
    route: Route,
  },
];



export const pagesRoute = [
  {
    id: 1,
    path: routes.signin,
    name: "signin",
    element: <Signin />,
    route: Route,
  },
  {
    id: 2,
    path: routes.signintwo,
    name: "signintwo",
    element: <SigninTwo />,
    route: Route,
  },
  {
    id: 3,
    path: routes.signinthree,
    name: "signinthree",
    element: <SigninThree />,
    route: Route,
  },
  {
    id: 4,
    path: routes.register,
    name: "register",
    element: <Register />,
    route: Route,
  },
  {
    id: 5,
    path: routes.registerTwo,
    name: "registerTwo",
    element: <RegisterTwo />,
    route: Route,
  },
  {
    id: 6,
    path: routes.registerThree,
    name: "registerThree",
    element: <RegisterThree />,
    route: Route,
  },
  {
    id: 7,
    path: routes.forgotPassword,
    name: "forgotPassword",
    element: <Forgotpassword />,
    route: Route,
  },
  {
    id: 7,
    path: routes.forgotPasswordTwo,
    name: "forgotPasswordTwo",
    element: <ForgotpasswordTwo />,
    route: Route,
  },
  {
    id: 8,
    path: routes.forgotPasswordThree,
    name: "forgotPasswordThree",
    element: <ForgotpasswordThree />,
    route: Route,
  },
  {
    id: 9,
    path: routes.resetpassword,
    name: "resetpassword",
    element: <Resetpassword />,
    route: Route,
  },
  {
    id: 10,
    path: routes.resetpasswordTwo,
    name: "resetpasswordTwo",
    element: <ResetpasswordTwo />,
    route: Route,
  },
  {
    id: 11,
    path: routes.resetpasswordThree,
    name: "resetpasswordThree",
    element: <ResetpasswordThree />,
    route: Route,
  },
  {
    id: 12,
    path: routes.emailverification,
    name: "emailverification",
    element: <EmailVerification />,
    route: Route,
  },
  {
    id: 12,
    path: routes.emailverificationTwo,
    name: "emailverificationTwo",
    element: <EmailverificationTwo />,
    route: Route,
  },
  {
    id: 13,
    path: routes.emailverificationThree,
    name: "emailverificationThree",
    element: <EmailverificationThree />,
    route: Route,
  },
  {
    id: 14,
    path: routes.twostepverification,
    name: "twostepverification",
    element: <Twostepverification />,
    route: Route,
  },
  {
    id: 15,
    path: routes.twostepverificationTwo,
    name: "twostepverificationTwo",
    element: <TwostepverificationTwo />,
    route: Route,
  },
  {
    id: 16,
    path: routes.twostepverificationThree,
    name: "twostepverificationThree",
    element: <TwostepverificationThree />,
    route: Route,
  },
  {
    id: 17,
    path: routes.lockscreen,
    name: "lockscreen",
    element: <Lockscreen />,
    route: Route,
  },
  {
    id: 18,
    path: routes.error404,
    name: "error404",
    element: <Error404 />,
    route: Route,
  },
  {
    id: 19,
    path: routes.error500,
    name: "error500",
    element: <Error500 />,
    route: Route,
  },
  {
    id: 20,
    path: routes.comingsoon,
    name: "comingsoon",
    element: <Comingsoon />,
    route: Route,
  },
  {
    id: 21,
    path: routes.undermaintenance,
    name: "undermaintenance",
    element: <Undermaintainence />,
    route: Route,
  },
  {
    id: 22,
    path:routes.layout,
    name: "layout",
    element: <Layout />,
    route: Route,
  },
  {
    id:23,
    path:routes.csdashboard,
    name:"csdashboard",
    element:<Navigate to="/admin-dashboard" replace />,
    route:Route
  },
  {
    id:24,
    path:routes.deliverychallan,
    name:"deliverychallan",
    element:<DeliveryChallanPreview/>,
    route:Route
  },
  {
    id:25,
    path:routes.implementationchallan,
    name:"implementationchallan",
    element:<ImplementationChallanPreview/>,
    route:Route
  },
  {
    id:26,
    path:routes.challandashboard,
    name:"challandashboard",
    element:<ChallanDashboard/>,
    route:Route
  },
  {
    id:27,
    path:routes.invoicepreviewbuilder,
    name:"invoicepreviewbuilder",
    element:<InvoicePreviewBuilder/>,
    route:Route
  },
  {
    id:28,
    path:routes.invoiceList,
    name:"invoiceList",
    element:<InvoiceList/>,
    route:Route
  },
  {
    id:29,
    path:routes.invoiceprintpreview,
    name:"invoiceprintpreview",
    element:<InvoicePrintPreview/>,
    route:Route
  },
];

