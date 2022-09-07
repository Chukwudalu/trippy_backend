class APIFeatures{
    constructor(query, queryString){
        this.query = query;
        this.queryString = queryString;
    }

    filter(){
        // 1A)----------------FILTERING--------------
        // Destructure the query object to get all the fields and save in a new object
        // This is done so as to not modify the original request object
        const queryObj = {...this.queryString};
        // An array of all query parameters to be excluded
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        // Loop over the excluded fields and delete each field in the queryObj with the same name
        excludedFields.forEach(el => delete queryObj[el])

        // 1B)---------------ADVANCED FILTERING---------------
        let queryStr = JSON.stringify(queryObj)
        // Using a regex to find a group of words that match those specified and replace them in the query string
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)

        this.query = this.query.find(JSON.parse(queryStr));

        return this;
    }

    sort(){
        if(this.queryString.sort){
            const sortBy = this.queryString.sort.split(',').join(' ')
            this.query = this.query.sort(sortBy)
            // sort('price ratingsAverage')
        }else{
            this.query = this.query.sort('-createdAt')
        }

        return this;
    }

    limitFields(){
        if(this.queryString.fields){
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields)
        }else{
            this.query = this.query.select('-__v')
        }

        return this;
    }

    paginate(){
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit

        this.query = this.query.skip(skip).limit(limit)

        return this
    }
}

module.exports = APIFeatures;