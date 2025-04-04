// https://production.comart.in


//let BaseURL = "https://localhost:7035";

 let BaseURL ='https://productionapi.comart.in';

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
            GetAllJobsAccToLocation: BaseURL + '/api/JobSummary/GetAllJobAccToLocation',
            GetCustomerNameAccToLocation: BaseURL + '/api/JobSummary/GetCustomerNameFromSql',
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
            TotalSQFT:"/api/Printing/TotalSQFT"
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
        }
    },
    ImplementationUpload: {
        URL: {
            GetAllImplementationUpload: BaseURL + '/api/ImplementationUpload/GetAllImplementationUpload',
            GetImplementationUploadWithSalonAddress: BaseURL + '/api/ImplementationUpload/GetImplementationUploadWithSalonAddress',
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
        }
    }
}

export default config;
