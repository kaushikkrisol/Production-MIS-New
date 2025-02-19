// https://production.comart.in

let BaseURL = "https://localhost:7035";

// let BaseURL ='https://productionapi.comart.in'

const config ={
    User: {
        URL: {
            Checkuser: BaseURL + '/User/Checkuser',
            GetAllUserrole: BaseURL + '/User/getalluserrole/getalluserrole',
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
        }
    },
    Design: {
        URL: {
            AddDesign: BaseURL + '/api/Design',
            Getalldesign: BaseURL + '/api/Design/Getalldesign',
            AddStart: BaseURL + '/api/Design/Addesignstart',
            AddStop: BaseURL + '/api/Design/Addesignstop',
            TotalHoursWork: BaseURL + '/api/Design/TotalHoursWork',
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
        }
    },
    Implementation: {
        URL: {
            AddImplementation: BaseURL + '/api/Implementation',
            GetallImplementation: BaseURL + '/api/Implementation/GetAllImplementation',
            AddImplementationStart: BaseURL + '/api/Implementation/AddImplementationStart',
            AddImplementationStop: BaseURL + '/api/Implementation/AddImplementationStop',
            GetallImplementationJobs: BaseURL + '/api/Implementation/GetAllImplementationjobs',
        }
    },
    ImplementationUpload: {
        URL: {
            GetAllImplementationUpload: BaseURL + '/api/ImplementationUpload/GetAllImplementationUpload',
            GetImplementationUploadWithSalonAddress: BaseURL + '/api/ImplementationUpload/GetImplementationUploadWithSalonAddress',
        }
    },
    Report: {
        URL: {
            AddReport: BaseURL + '/api/Report',
            Getallreport: BaseURL + '/api/Report/Getallreport',
        }
    }
}

export default config;
