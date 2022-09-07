// exports.checkID = (req, res, next, val) => {
//     console.log(`Tour Id is ${val}`);
//     if(req.params.id * 1 > tours.length){
//         return res.status(404).json({
//             status: 'fail',
//             message: 'Invalid ID'
//         })
//     }
//     next();
// }

// exports.checkBody = (req, res, next) => {
//     if(!req.body.name || !req.body.price){
//         return res.status(400).json({
//             status: 'fail',
//             message: 'Missing name or price'
//         })
//     }
//     next()
// }\
// const query = await Tour.find()
        //     .where('duration')
        //     .equals(5)
        //     .where('difficulty')
        //     .equals('easy')
       
       





     try {
        // FILTERING
        const queryObj = {...req.query}
        const excludedFields = ['page', 'sort', 'limit', 'fields'];
        excludedFields.forEach(f => delete queryObj[f])

        let queryStr = JSON.stringify(queryObj)
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)

        const query = Tour.find(JSON.parse(queryStr));

        // SORTING
        // find if there is a sort field in the query obj and if there is, split the string where the comma is and joing it with a space
        if(req.query.sort){
            const sortBy = req.query.sort.split(',').join(' ')
            query = query.sort(sortBy)
        }else{
            query = query.sort('-createdAt')
        }

        // FIELD LIMITING
        if(req.query.fields){
            const fields = req.query.fields.split(',').join(' ')
            query = query.select(fields)
        }else{
            query = query.select('-__v')
        }

        // PAGINATION
        const limit = req.query.limit;
        const page = req.query.page;
        // page 1 = 1-10, page 2 = 11 - 20, page 3 = 21 -30
        const skip = (page - 1) * limit

        query = query.skip(skip).limit(limit)
        if(req.query.page){
            const numTours = await Tour.countDocuments()
            if(skip > numTours) throw new Error('This page does not exist')
        }

        // FETCHING DATA
        const tours = await query

        res.status(200).json({
            status: 'success',
            results: tours.length,
            data: {
                tours
            }
        })

    } catch (err) {
        console.log(err.message)
        res.status(404).json({
            status: 'fail',
            message: err.message
        })
    }