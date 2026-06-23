// https://production.comart.in

// let BaseURL = "https://localhost:7035"; 
let BaseURL = "https://productionapi.comart.in";                                                                                                                                                        

// let BaseURL = "https://testproductionapi.comart.in";
let BaseURL1 = "https://stores.comart.in:3001";
let BaseURL2 = BaseURL;
// let BaseURL2 = "http://localhost:3008";
// let BaseURL1 = "http://localhost:3001/api/get-orders";

const config ={    
    User: {
        URL: {
            Checkuser: BaseURL + '/User/Checkuser',
            GetAllUserrole: BaseURL + '/User/getalluserrole/getalluserrole',
            GetAllUserAccToLocation: BaseURL + '/User/GetAllUserAccToLocation/GetAllUserAccToLocation',
        }
    },
    JobSummary: {
        URL: {
            Addjobdetails: BaseURL + '/api/JobSummary/Addjobdetails',
            Getalljob: BaseURL + '/api/JobSummary/Getalljob',
            TotalJobcount: BaseURL + '/api/JobSummary/TotalJobcount',
            Getallcustomer: BaseURL + '/api/JobSummary/Getallcustomer',
            AddreprintData : BaseURL +'/api/JobSummary/AddreprintData',
            GetJobsWithoutExcelUpload: BaseURL + '/api/JobSummary/GetJobsWithoutExcelUpload',
            GetAllJobsFromSql: BaseURL + '/api/JobSummary/GetAllJobsFromSql',
            DeleteSelectedJobs:BaseURL+'/api/JobSummary/DeleteSelectedJobsById',
            GetAllJobsAccToLocation: BaseURL + '/api/JobSummary/GetAllJobAccToLocation',
            GetCustomerNameAccToLocation: BaseURL + '/api/JobSummary/GetCustomerNameFromSql',
            SetJobOnHold: BaseURL + '/api/JobSummary/SetJobOnHold',
            SetJobisPending: BaseURL + '/api/JobSummary/SetJobisPending',
            UpdateProductionLocation: BaseURL + '/api/JobSummary/UpdateProductionLocation',
            GetDeletedData:BaseURL+'/api/JobSummary/GetDeletedData',
            RestoreJob:BaseURL+'/api/JobSummary/RestoreJob',
            ResumeJobFromHold: "/api/JobSummary/ResumeJobFromHold"

        }
    },
    Design: {
        URL: {
            AddDesign: BaseURL + '/api/Design',
            Getalldesign: BaseURL + '/api/Design/Getalldesign',
            GetAllDesignFromCs: BaseURL + '/api/Design/GetAllDesignFromCs',
            GetDesignByUserId: BaseURL + '/api/Design/GetDesignByUserId',
            AddStart: BaseURL + '/api/Design/Addesignstart',
            AddStop: BaseURL + '/api/Design/Addesignstop',
            TotalHoursWork: BaseURL + '/api/Design/TotalHoursWork',
            GetAllDesignAccToLocation: BaseURL + '/api/Design/GetAllDesignAccToLocation',
            UpdateDesign: BaseURL + '/api/Design/UpdateDesign',
        }
    },
    Approval:{
        URL:{
            Sendmailforcustomer:BaseURL+'/api/Approval/Sendmailforcustomer',
            getApprovalRequest:BaseURL+'/api/Approval/getApprovalRequest',
            ApproveLineItems: BaseURL + '/api/Approval/ApproveLineItems',


        }
    },
    Printing: {
        URL: {
            AddPrinting: BaseURL + '/api/Printing',
            UpdateProductionData: BaseURL + '/api/Printing/UpdateProductionData',
            Getallprinting: BaseURL + '/api/Printing/Getallprinting',
            AddPrintingStart: BaseURL + '/api/Printing/Addprintingstart',
            AddPrintingStop: BaseURL + '/api/Printing/Addprintingstop',
            TotalPrintingJobcount: BaseURL + '/api/Printing/TotalPrintingJobcount',
            GetCompletedPrinting: BaseURL + '/api/Printing/GetCompletedPrinting',
            TotalSQFT: BaseURL + "/api/Printing/TotalSQFT"
        }
    },
        RetailCustomer: {
        URL: {
            GetAll: BaseURL + '/api/RetailCustomer/GetAll',
            GetById: (id) => BaseURL + `/api/RetailCustomer/GetById/${id}`,
            Add: BaseURL + '/api/RetailCustomer/Add',
            Update: BaseURL + '/api/RetailCustomer/Update',
            Delete: BaseURL + '/api/RetailCustomer/Delete',
        }
    },
        Recce: {
        URL: {
            GetAll: BaseURL + '/api/Recce/GetAll',
            GetById: (id) => BaseURL + `/api/Recce/GetById/${id}`,
            Add: BaseURL + '/api/Recce/Add',
            Update: BaseURL + '/api/Recce/Update',
            Delete: BaseURL + '/api/Recce/Delete',
        }
    },
    Delivery: {
        URL: {
            AddDelivery: BaseURL + '/api/Delivery',
            Getalldelivery: BaseURL + '/api/Delivery/Getalldelivery',
            Addeliverystart: BaseURL + '/api/Delivery/Addeliverystart',
            Addeliverystop: BaseURL + '/api/Delivery/Addeliverystop',
            Getalldeliveryjobs: BaseURL + '/api/Delivery/Getalldeliveryjobs',
            GetAllDeliveryAccToLocation: BaseURL + '/api/Delivery/GetAllDeliveryAccToLocation',
            UpdateTimestamp: BaseURL + '/api/Delivery/UpdateTimestamp',
            CreateDeliveryChallan: BaseURL+"/api/Delivery/CreateDeliveryChallan",
            GetAllDeliveryChallans: BaseURL+"/api/Delivery/GetAllDeliveryChallans",
            GetDeliveryChallanById: BaseURL+"/api/Delivery/GetDeliveryChallanById",
            GetDeliveryChallanByJobNo: BaseURL+"/api/Delivery/GetDeliveryChallanByJobNo",
            GetAllChallansDashboard: BaseURL+"/api/Delivery/GetAllChallansDashboard"
        }
    },
    Implementation: {
        URL: {
            AddImplementation: BaseURL + '/api/Implementation',
            GetallImplementation: BaseURL + '/api/Implementation/GetAllImplementation',
            AddImplementationStart: BaseURL + '/api/Implementation/AddImplementationStart',
            AddImplementationStop: BaseURL + '/api/Implementation/AddImplementationStop',
            GetallImplementationJobs: BaseURL + '/api/Implementation/GetAllImplementationjobs',
            GetAllImplementationAccToLocation: BaseURL + '/api/Implementation/GetAllImplementationAccToLocation',
            UpdateTimestamp: BaseURL + '/api/Implementation/UpdateTimestamp',
            CreateImplementationChallan: BaseURL + "/api/Implementation/CreateImplementationChallan",
            GetImplementationChallanById: BaseURL + "/api/Implementation/GetImplementationChallanById",
            GetImplementationChallanByJobNo: BaseURL + "/api/Implementation/GetImplementationChallanByJobNo"
            
        }
    },
    ImplementationUpload: {
        URL: {
            GetAllImplementationUpload: BaseURL + '/api/ImplementationUpload/GetAllImplementationUpload',
            GetImplementationUploadWithSalonAddress: BaseURL + '/api/ImplementationUpload/GetImplementationUploadWithSalonAddress',
            Upload : BaseURL + '/api/ImplementationUpload/Upload',
            GetPdfDataByCsId: BaseURL + '/api/ImplementationUpload/GetPdfDataByCsId',
             ImageStatusById: BaseURL + '/api/ImplementationUpload/ImageStatusById/',
            GetByJobNoAndStoreName: BaseURL + '/api/ImplementationUpload/GetByJobNoAndStoreName',
        }
    },
    DesignJobs: {
        URL: {
            GetDesignJobsByJobNumber: BaseURL + '/api/DesignJobs/get-by-job/',
            // GetAllDesignJobs: BaseURL + '/api/DesignJobs/GetAll',
            AddDesignJob: BaseURL + '/api/DesignJobs/Add',
            UpdateDesignJob: BaseURL + '/api/DesignJobs/Update',
            DeleteDesignJob: BaseURL + '/api/DesignJobs/Delete',
            GetAllDesignJobs: BaseURL + '/api/DesignJobs/GetAllDesignJobs',
        }
    },
    ProductMediaRateMaster: {
        URL: {
            GetAll: BaseURL + '/api/ProductMediaRateMaster/GetAll',
            GetById: (id) => BaseURL + `/api/ProductMediaRateMaster/GetById/${id}`,
            Add: BaseURL + '/api/ProductMediaRateMaster/Add',
            Update: BaseURL + '/api/ProductMediaRateMaster/Update',
            Delete: BaseURL + '/api/ProductMediaRateMaster/Delete',
            GetByCustomerAndMedia: (customerId, media) =>
                BaseURL + `/api/ProductMediaRateMaster/GetByCustomerAndMedia?customerId=${encodeURIComponent(customerId || '')}&media=${encodeURIComponent(media || '')}`,
        }
    },
    ElementGroupMaster: {
        URL: {
            GetAll: BaseURL + '/api/ElementGroupMaster/GetAll',
            GetById: (id) => BaseURL + `/api/ElementGroupMaster/GetById/${id}`,
            Add: BaseURL + '/api/ElementGroupMaster/Add',
            Update: BaseURL + '/api/ElementGroupMaster/Update',
            Delete: BaseURL + '/api/ElementGroupMaster/Delete',
        }
    },
    SalesInvoice: {
        URL: {
            Save: BaseURL + '/api/SalesInvoice/Save',
            GetAll: BaseURL + '/api/SalesInvoice/GetAll',
            GetByInvoiceNo: (invoiceNo) => BaseURL + `/api/SalesInvoice/GetByInvoiceNo/${encodeURIComponent(invoiceNo || '')}`,
            Delete: BaseURL + '/api/SalesInvoice/Delete',
            SaveMultiLocationInvoice: BaseURL + '/api/SalesInvoice/SaveMultiLocationInvoice',
            CreateCreditNote: BaseURL + '/api/SalesInvoice/CreateCreditNote',
        }
    },
    MyPriority: {
        URL: {
            GetAllPriority: BaseURL + '/api/MyPriority/GetAllPriority',
            UpdatePriority: BaseURL + '/api/MyPriority/UpdateDesignPriority',
        }
    },
    Report: {
        URL: {
            AddReport: BaseURL + '/api/Report',
            Getallreport: BaseURL + '/api/Report/Getallreport',
            GetProductReportWithJobNo: BaseURL + '/api/Report/GetProductReportWithJobNo',
            GetallreportNoLocation: BaseURL + '/api/Report/GetallreportNoLocation',
            GetGangReport:BaseURL+ "/api/Report/GetGangReport"
        }
    },

    Order:{
        URL:{
            GetOrder:BaseURL1+'/api/get-orders',
            SaveOrder:BaseURL1+'/api/save-order',
            UpdateOrder:BaseURL1+'/api/update-order'

        }
    },

    downloadPDF:{
        URL:{
            GetPdf:BaseURL2+'/api/pdf/job/'
        }
    },
    Packing:{
        URL:{
            AddPackingData:BaseURL+'/api/Packing/AddPackingData',
            StartPacking:BaseURL+'/api/Packing/StartPacking',
            StopPacking:BaseURL+'/api/Packing/StopPacking',
            GetAllPacking:BaseURL+'/api/Packing/GetAllPacking',
            CreateDeliveryChallan:BaseURL+'/api/Packing/CreateDeliveryChallan',
            GetAllDeliveryChallans:BaseURL+'/api/Packing/GetAllDeliveryChallans',
            GetDeliveryChallanById:BaseURL+'/api/Packing/GetDeliveryChallanById/',

        }
    },
    JobProgressAlert: {
        URL: {
            SaveBulk: BaseURL + '/api/JobProgressAlert/SaveBulk',
            GetActive: BaseURL + '/api/JobProgressAlert/GetActive',
        }
    },
    
}



// Store API endpoints
config.Store = {
    URL: {
        Add: BaseURL + '/api/Store/add',
        List: BaseURL + '/api/Store/list',
        Update: BaseURL + '/api/Store/update',
        Delete: BaseURL + '/api/Store/delete',
    }
};

export default config;
