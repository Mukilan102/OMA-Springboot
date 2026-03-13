"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"

const happinessData = [
    { score: "\nExhausting", label: "VeryUnhappy", count: 5, color: "#ef4444" },
    { score: "\nLow on energy", label: "Unhappy", count: 12, color: "#fb923c" },
    { score: "\nNeutral", label: "Neutral", count: 25, color: "#fde047" },
    { score: "\nHappy", label: "Happy", count: 45, color: "#86efac" },
    { score: "\nHighly Positive", label: "Very Happy", count: 30, color: "#22c55e" },
]

// Calculate total and add percentage to each item
const totalCount = happinessData.reduce((sum, item) => sum + item.count, 0)
const dataWithPercentage = happinessData.map(item => ({
    ...item,
    percentage: ((item.count / totalCount) * 100).toFixed(1)
}))

const CustomBarLabel = (props: any) => {
    const { x, y, width, height, value, index } = props
    const percentage = dataWithPercentage[index]?.percentage || '0'
    
    return (
        <g>
            <text 
                x={x + width / 2} 
                y={y - 18} 
                fill="#4A4A4A" 
                textAnchor="middle" 
                fontSize={13}
                fontWeight="bold"
            >
                {value}
            </text>
            <text 
                x={x + width / 2} 
                y={y - 5} 
                fill="#717171" 
                textAnchor="middle" 
                fontSize={11}
            >
                ({percentage}%)
            </text>
        </g>
    )
}

export function HappinessChart() {
    return (
        <Card className="flex flex-col h-full shadow-md bg-white gradient-border-hover">
            <CardHeader className="items-center pb-2">
                <CardTitle className="text-xl lg:text-2xl font-medium text-[#002D72]">Employee Happiness Index</CardTitle>
                <CardDescription>Sentiment distribution across the organization</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-2 flex items-center justify-center w-full">
                <div className="h-[300px] w-full flex justify-center items-center">
                    <BarChart
                        width={600}
                        height={400}
                        data={dataWithPercentage}
                        margin={{
                            left: 10,
                            right: 50,
                            top: 40,
                            bottom: 80,
                        }}
                    >
                        <XAxis
                            dataKey="score"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#4B5563", fontSize: 13
                             }}
                        />
                        <YAxis type="number" stroke="#E5E7EB" tick={{ fill: "#4A4A4A", fontSize: 15 }} />
                        <Bar 
                            dataKey="count" 
                            radius={[4, 4, 0, 0]} 
                            barSize={47} 
                            label={<CustomBarLabel />}
                        >
                            {dataWithPercentage.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </div>
            </CardContent>
        </Card>
    )
}
