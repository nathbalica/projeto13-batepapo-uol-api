import joi from 'joi';


const nameSchema = joi.object({ name: joi.string().required() })


const messageSchema = joi.object({
    to: joi.string().required().messages({
        'any.required': 'O campo "to" é obrigatório.',
        'string.empty': 'O campo "to" não pode estar vazio.',
    }),
    text: joi.string().required().messages({
        'any.required': 'O campo "text" é obrigatório.',
        'string.empty': 'O campo "text" não pode estar vazio.',
    }),
    type: joi.string().valid('message', 'private_message').required().messages({
        'any.required': 'O campo "type" é obrigatório.',
        'any.only': 'O campo "type" deve ser "message" ou "private_message".',
    }),
    from: joi.string().required().messages({
        'any.required': 'O campo "from" é obrigatório.',
        'string.empty': 'O campo "from" não pode estar vazio.',
    })

})

export { nameSchema, messageSchema }